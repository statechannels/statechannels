import {Observable, fromEvent, merge, from} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';

import {BigNumber, bigNumberify} from 'ethers/utils';
import {Wallet} from 'ethers';

import {
  Participant,
  StateVariables,
  SignedState,
  State,
  Objective,
  Message,
  SiteBudget
} from './types';
import {MemoryChannelStoreEntry} from './memory-channel-storage';
import {ChannelStoreEntry} from './channel-store-entry';
import {AddressZero} from 'ethers/constants';
import {Chain, FakeChain} from '../chain';
import {calculateChannelId, hashState} from './state-utils';
import {NETWORK_ID} from '../constants';
import {Store} from './store';
import {Guid} from 'guid-typescript';
import {Errors} from '.';

const LOCK_TIMEOUT = 30000;

interface DirectFunding {
  type: 'Direct';
}

interface IndirectFunding {
  type: 'Indirect';
  ledgerId: string;
}

export interface VirtualFunding {
  type: 'Virtual';
  jointChannelId: string;
}

interface Guarantee {
  type: 'Guarantee';
  guarantorChannelId: string;
}

interface Guarantees {
  type: 'Guarantees';
  guarantorChannelIds: [string, string];
}

export type Funding = DirectFunding | IndirectFunding | VirtualFunding | Guarantees | Guarantee;
export function isIndirectFunding(funding: Funding): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding: Funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export function isGuarantee(funding: Funding): funding is Guarantee {
  return funding.type === 'Guarantee';
}
export function isGuarantees(funding: Funding): funding is Guarantees {
  return funding.type === 'Guarantees';
}

interface InternalEvents {
  channelUpdated: [ChannelStoreEntry];
  newObjective: [Objective];
  addToOutbox: [Message];
  lockUpdated: [ChannelLock];
}

export type ChannelLock = {
  channelId: string;
  lock?: Guid;
};

export class MemoryStore implements Store {
  readonly chain: Chain;
  protected _channels: Record<string, MemoryChannelStoreEntry | undefined> = {};
  private _objectives: Objective[] = [];
  private _nonces: Record<string, BigNumber | undefined> = {};
  private _eventEmitter = new EventEmitter<InternalEvents>();
  private _privateKeys: Record<string, string | undefined> = {};
  protected _ledgers: Record<string, string> = {};
  protected _channelLocks: Record<string, Guid | undefined> = {};
  private _budgets: Record<string, SiteBudget> = {};

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

  public getBudget(site: string): Promise<SiteBudget | undefined> {
    return Promise.resolve(this._budgets[site]);
  }
  public updateOrCreateBudget(budget: SiteBudget): Promise<void> {
    this._budgets[budget.site] = budget;
    return Promise.resolve();
  }

  public channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry> {
    // TODO: The following line is not actually type safe.
    // fromEvent<'foo'>(this._eventEmitter, 'channelUpdated') would happily return
    // Observable<'foo'>
    const newEntries = fromEvent<ChannelStoreEntry>(this._eventEmitter, 'channelUpdated').pipe(
      filter(cs => cs.channelId === channelId)
    );

    const currentEntry = this._channels[channelId] ? from(this.getEntry(channelId)) : from([]);

    return merge(currentEntry, newEntries);
  }

  get objectiveFeed(): Observable<Objective> {
    const newObjectives = fromEvent<Objective>(this._eventEmitter, 'newObjective');
    const currentObjectives = from(this._objectives);

    return merge(newObjectives, currentObjectives);
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

  public async acquireChannelLock(channelId: string): Promise<ChannelLock> {
    const lock = this._channelLocks[channelId];
    if (lock) throw new Error(Errors.channelLocked);

    const newStatus = {channelId, lock: Guid.create()};
    this._channelLocks[channelId] = newStatus.lock;

    setTimeout(async () => {
      try {
        await this.releaseChannelLock(newStatus);
      } finally {
        // NO OP
      }
    }, LOCK_TIMEOUT);
    this._eventEmitter.emit('lockUpdated', newStatus);

    return newStatus;
  }

  public async releaseChannelLock(status: ChannelLock): Promise<void> {
    if (!status.lock) throw new Error('Invalid lock');

    const {channelId, lock} = status;
    const currentStatus = this._channelLocks[channelId];
    if (!currentStatus) return;
    if (!currentStatus.equals(lock)) throw new Error('Invalid lock');

    const newStatus = {channelId, lock: undefined};
    this._channelLocks[channelId] = undefined;
    this._eventEmitter.emit('lockUpdated', newStatus);
  }

  public get lockFeed(): Observable<ChannelLock> {
    return merge(
      from(_.map(this._channelLocks, (lock: Guid, channelId) => ({lock, channelId}))),
      fromEvent<ChannelLock>(this._eventEmitter, 'lockUpdated')
    );
  }

  public async getLedger(peerId: string) {
    const ledgerId = this._ledgers[peerId];
    if (!ledgerId) throw new Error(`No ledger exists with peer ${peerId}`);

    return await this.getEntry(ledgerId);
  }

  public async setLedger(channelId: string): Promise<void> {
    const entry = this._channels[channelId];
    if (!entry) throw 'No entry for channelId';
    this.setLedgerByEntry(entry);
  }

  public setLedgerByEntry(entry: MemoryChannelStoreEntry) {
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
    if (!_.includes(this._objectives, objective)) {
      this._objectives.push(objective);
      this._eventEmitter.emit('addToOutbox', {objectives: [objective]});
      this._eventEmitter.emit('newObjective', objective);
    }
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
    filter(e => e.isSupported),
    map(({supported}) => ({state: supported}))
  );
}
