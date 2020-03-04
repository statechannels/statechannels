import {Observable, fromEvent, merge, from} from 'rxjs';
import {filter, catchError, map} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';

import {BigNumber, bigNumberify} from 'ethers/utils';
import {Wallet} from 'ethers';

import {Participant, StateVariables, SignedState, State, Objective, Message} from './types';
import {MemoryChannelStoreEntry, ChannelStoreEntry} from './memory-channel-storage';
import {AddressZero} from 'ethers/constants';
import {Chain, FakeChain} from '../chain';
import {calculateChannelId, hashState} from './state-utils';
import {NETWORK_ID} from '../constants';
import {checkThat, exists} from '../utils';

interface DirectFunding {
  type: 'Direct';
  amount: BigNumber;
}

interface IndirectFunding {
  type: 'Indirect';
  ledgerId: string;
}

interface VirtualFunding {
  type: 'Virtual';
  jointChannelId: string;
}

interface Guaranteed {
  type: 'Guarantee';
  guarantorChannelIds: [string, string];
}

export type Funding = DirectFunding | IndirectFunding | VirtualFunding | Guaranteed;
export function isIndirectFunding(funding: Funding): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding: Funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export function isGuarantee(funding: Funding): funding is Guaranteed {
  return funding.type === 'Guarantee';
}
// get it so that when you add a state to a channel, it sends that state to all participant

interface InternalEvents {
  channelUpdated: [ChannelStoreEntry];
  newObjective: [Objective];
  addToOutbox: [Message];
}

export interface Store {
  newObjectiveFeed: Observable<Objective>;
  outboxFeed: Observable<Message>;
  pushMessage: (message: Message) => Promise<void>;
  channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry>;

  getAddress(): string;
  signAndAddState(channelId: string, stateVars: StateVariables): Promise<void>;
  createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition?: string
  ): Promise<ChannelStoreEntry>;
  getEntry(channelId): Promise<ChannelStoreEntry>;
  getLedger(peerId: string): Promise<ChannelStoreEntry>;
  // TODO: This is awkward. Might be better to set the funding on create/initialize channel?
  setFunding(channelId: string, funding: Funding): Promise<void>;

  // TODO: I don't know how the store is mean to send outgoing messages.
  // But I need one, in order to implement virtual funding.
  addObjective(objective: Objective): void;

  // TODO: should this be exposed via the Store?
  chain: Chain;
}

export class MemoryStore implements Store {
  readonly chain: Chain;
  private _channels: Record<string, MemoryChannelStoreEntry | undefined> = {};
  private _objectives: Objective[] = [];
  private _nonces: Record<string, BigNumber | undefined> = {};
  private _eventEmitter = new EventEmitter<InternalEvents>();
  private _privateKeys: Record<string, string | undefined> = {};
  private _ledgers: Record<string, string | undefined> = {};

  constructor(privateKeys?: string[], chain?: Chain) {
    // TODO: We shouldn't default to a fake chain
    // but I didn't feel like updating all the constructor calls
    this.chain = chain || new FakeChain();
    this.chain.initialize();

    if (privateKeys && privateKeys.length > 0) {
      // load existing keys
      privateKeys.forEach(key => {
        const wallet = new Wallet(key);
        this._privateKeys[wallet.address] = wallet.privateKey;
      });
    } else {
      // generate a new key
      const wallet = Wallet.createRandom();
      this._privateKeys[wallet.address] = wallet.privateKey;
    }
  }

  // for short-term backwards compatibility
  public channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry> {
    // TODO: The following line is not actually type safe.
    // fromEvent<'foo'>(this._eventEmitter, 'channelUpdated') would happily return
    // Observable<'foo'>
    const newEntries = fromEvent<ChannelStoreEntry>(this._eventEmitter, 'channelUpdated').pipe(
      filter(cs => cs.channelId === channelId)
    );

    const currentEntry = from(this.getEntry(channelId));

    return merge(currentEntry, newEntries).pipe(
      catchError(e => {
        // TODO: This seems fragile
        if (e === 'Channel id not found') {
          return newEntries;
        } else {
          throw e;
        }
      })
    );
  }

  get newObjectiveFeed(): Observable<Objective> {
    return fromEvent(this._eventEmitter, 'newObjective');
  }

  get outboxFeed(): Observable<Message> {
    return fromEvent(this._eventEmitter, 'addToOutbox');
  }

  private async initializeChannel(state: State): Promise<MemoryChannelStoreEntry> {
    const addresses = state.participants.map(x => x.signingAddress);

    const myIndex = addresses.findIndex(address => !!this._privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const channelId = calculateChannelId(state);

    // TODO: There could be concurrency problems which lead to entries potentially being overwritten.
    this.setNonce(addresses, state.channelNonce);
    const key = hashState(state);
    const entry =
      this._channels[channelId] || new MemoryChannelStoreEntry(state, myIndex, {[key]: state});

    this._channels[channelId] = entry;
    return Promise.resolve(entry);
  }

  public async setFunding(channelId: string, funding: Funding): Promise<void> {
    const channelEntry = this._channels[channelId];
    if (!channelEntry) {
      throw new Error(`No channel for ${channelId}`);
    }
    if (channelEntry.funding) {
      throw `Channel ${channelId} already funded`;
    }
    channelEntry.setFunding(funding);
  }

  public async getLedger(peerId: string) {
    const ledgerId = this._ledgers[peerId];

    if (!ledgerId) throw new Error(`No ledger exists with peer ${peerId}`);

    return await this.getEntry(ledgerId);
  }

  public setLedger(entry: MemoryChannelStoreEntry) {
    // This is not on the Store interface itself -- it is useful to set up a test store
    const {channelId} = entry;
    this._channels[channelId] = entry;

    const peerId = entry.participants.find(p => p.signingAddress !== this.getAddress());
    if (peerId) this._ledgers[peerId.participantId] = channelId;
    else throw 'No peer';
  }

  public async createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition = AddressZero
  ): Promise<ChannelStoreEntry> {
    const addresses = participants.map(x => x.signingAddress);

    const myIndex = addresses.findIndex(address => !!this._privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const channelNonce = this.getNonce(addresses).add(1);
    const chainId = NETWORK_ID;

    const entry = await this.initializeChannel({
      chainId,
      challengeDuration,
      channelNonce,
      participants,
      appDefinition,
      ...stateVars
    });

    // sign the state, store the channel
    this.signAndAddState(
      entry.channelId,
      _.pick(stateVars, 'outcome', 'turnNum', 'appData', 'isFinal')
    );

    return Promise.resolve(entry);
  }
  private getNonce(addresses: string[]): BigNumber {
    return this._nonces[this.nonceKeyFromAddresses(addresses)] || bigNumberify(-1);
  }

  private setNonce(addresses: string[], value: BigNumber) {
    if (value.lte(this.getNonce(addresses))) throw 'Invalid nonce';

    this._nonces[this.nonceKeyFromAddresses(addresses)] = value;
  }

  private nonceKeyFromAddresses = (addresses: string[]): string => addresses.join('::');

  async signAndAddState(channelId: string, stateVars: StateVariables) {
    const channelStorage = this._channels[channelId];

    if (!channelStorage) {
      throw new Error('Channel not found');
    }
    const {participants} = channelStorage;
    const myAddress = participants[channelStorage.myIndex].signingAddress;
    const privateKey = this._privateKeys[myAddress];

    if (!privateKey) {
      throw new Error('No longer have private key');
    }

    const signedState = channelStorage.signAndAdd(
      _.pick(stateVars, 'outcome', 'turnNum', 'appData', 'isFinal'),
      privateKey
    );
    this._eventEmitter.emit('channelUpdated', await this.getEntry(channelId));
    this._eventEmitter.emit('addToOutbox', {signedStates: [signedState]});
  }

  addObjective(objective: Objective) {
    this._eventEmitter.emit('addToOutbox', {objectives: [objective]});
  }

  async addState(state: SignedState): Promise<ChannelStoreEntry> {
    const channelId = calculateChannelId(state);
    const channelStorage = this._channels[channelId] || (await this.initializeChannel(state));
    // TODO: This is kind of awkward
    state.signatures.forEach(sig => channelStorage.addState(state, sig));
    this._eventEmitter.emit('channelUpdated', await this.getEntry(channelId));
    return this.getEntry(channelId);
  }

  public getAddress(): string {
    return Object.keys(this._privateKeys)[0];
  }

  async pushMessage(message: Message) {
    const {signedStates, objectives} = message;

    if (signedStates) {
      // todo: check sig
      // todo: check the channel involves me
      await Promise.all(
        signedStates.map(async signedState => {
          await this.addState(signedState);
        })
      );
    }

    objectives?.forEach(objective => {
      if (!_.includes(this._objectives, objective)) {
        this._objectives.push(objective);
        this._eventEmitter.emit('newObjective', objective);
      }
    });
  }

  public async getEntry(channelId: string): Promise<ChannelStoreEntry> {
    const entry = this._channels[channelId];
    if (!entry) {
      throw 'Channel id not found';
    }

    return entry;
  }
}

export function supportedStateFeed(store: Store, channelId: string) {
  return store.channelUpdatedFeed(channelId).pipe(
    map(e => ({
      state: {...checkThat<StateVariables>(e.supported, exists), ...e.channelConstants}
    }))
  );
}
