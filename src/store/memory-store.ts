import {Observable, fromEvent} from 'rxjs';
import {filter} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';
import {getChannelId} from '@statechannels/nitro-protocol';

import {BigNumber, bigNumberify} from 'ethers/utils';
import {Wallet} from 'ethers';

import {Participant, StateVariables, State, SignedState} from './types';
import {MemoryChannelStoreEntry, ChannelStoreEntry} from './memory-channel-storage';
import {AddressZero} from 'ethers/constants';
import {Objective, Message} from './wire-protocol';
import {Chain, FakeChain} from '../chain';
import {calculateChannelId} from './state-utils';

interface DirectFunding {
  type: 'Direct';
}

interface IndirectFunding {
  type: 'Indirect';
  ledgerId: string;
}

interface VirtualFunding {
  type: 'Virtual';
  jointChannelId: string;
  guarantorChannelId: string;
}

interface Guaranteed {
  type: 'Guarantee';
  guarantorChannelIds: [string, string];
}

export type Funding = DirectFunding | IndirectFunding | VirtualFunding | Guaranteed;

// get it so that when you add a state to a channel, it sends that state to all participant

interface InternalEvents {
  stateReceived: [State];
  newObjective: [Objective];
  addToOutbox: [Message];
}

export interface Store {
  newObjectiveFeed: Observable<Objective>;
  outboxFeed: Observable<Message>;
  pushMessage: (message: Message) => Promise<void>;
  channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry>;

  getAddress(): string;
  signState(channelId: string, stateVars: StateVariables);
  createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    appDefinition?: string
  ): Promise<ChannelStoreEntry>;
  getEntry(channelId): Promise<ChannelStoreEntry>;

  // TODO: Shoud this be part of the store?
  getChainInfo: Chain['getChainInfo'];
  chainUpdatedFeed: Chain['chainUpdatedFeed'];
  deposit: Chain['deposit'];
}

export class MemoryStore implements Store {
  protected _chain: Chain;
  private _channels: Record<string, MemoryChannelStoreEntry> = {};
  private _objectives: Objective[] = [];
  private _nonces: Record<string, BigNumber> = {};
  private _eventEmitter = new EventEmitter<InternalEvents>();
  private _privateKeys: Record<string, string> = {};
  // private _channels: Record<string, any> = {};

  constructor(privateKeys?: string[], chain?: Chain) {
    // TODO: We shouldn't default to a fake chain
    // but I didn't feel like updating all the constructor calls
    this._chain = chain || new FakeChain();
    this._chain.initialize();

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

  public stateReceivedFeed(channelId: string): Observable<State> {
    return fromEvent<State>(this._eventEmitter, 'stateReceived').pipe(
      filter(state => calculateChannelId(state) === channelId)
    );
  }

  // for short-term backwards compatibility
  public channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry> {
    return fromEvent<ChannelStoreEntry>(this._eventEmitter, 'channelUpdated').pipe(
      filter(cs => cs.channelId === channelId)
    );
  }

  get newObjectiveFeed(): Observable<Objective> {
    return fromEvent(this._eventEmitter, 'newObjective');
  }

  get outboxFeed(): Observable<Message> {
    return fromEvent(this._eventEmitter, 'addToOutbox');
  }

  public async createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    appDefinition = AddressZero
  ): Promise<ChannelStoreEntry> {
    const addresses = participants.map(x => x.signingAddress);

    const myIndex = addresses.findIndex(address => !!this._privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const currentNonce = this.getNonce(addresses);
    const channelNonce = currentNonce ? currentNonce.add(1) : bigNumberify(0);
    this.setNonce(addresses, channelNonce);
    const chainId = '1';

    const channelId = getChannelId({
      chainId,
      channelNonce: channelNonce.toString(),
      participants: addresses
    });
    this._channels[channelId] = new MemoryChannelStoreEntry(
      {channelNonce, chainId, participants, appDefinition, challengeDuration},
      myIndex
    );

    return Promise.resolve(this._channels[channelId]);
  }

  private getNonce(addresses: string[]): BigNumber | undefined {
    return this._nonces[this.nonceKeyFromAddresses(addresses)];
  }

  private setNonce(addresses: string[], value: BigNumber) {
    this._nonces[this.nonceKeyFromAddresses(addresses)] = value;
  }

  private nonceKeyFromAddresses = (addresses: string[]): string => addresses.join('::');

  signState(channelId: string, stateVars: StateVariables) {
    const channelStorage = this._channels[channelId];

    if (!channelStorage) {
      throw new Error('Channel not found');
    }
    const myAddress = channelStorage.participants[channelStorage.myIndex].signingAddress;
    const privateKey = this._privateKeys[myAddress];

    if (!privateKey) {
      throw new Error('No longer have private key');
    }

    const signedState = channelStorage.signAndAdd(stateVars, privateKey);

    this._eventEmitter.emit('addToOutbox', {signedStates: [signedState]});
  }

  async addState(state: SignedState) {
    const channelId = calculateChannelId(state);
    let channelStorage = this._channels[channelId];

    if (!channelStorage) {
      await this.createChannel(state.participants, state.challengeDuration, state.appDefinition);
      channelStorage = this._channels[channelId];
    }

    channelStorage.addState(state, state.signature);
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
          const {signature, ...state} = signedState;
          await this.addState(signedState);
          this._eventEmitter.emit('stateReceived', state);
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
    return this._channels[channelId];
  }

  chainUpdatedFeed(channelId: string) {
    // TODO: Implement this
    return this._chain.chainUpdatedFeed(channelId);
  }

  deposit(channelId: string, expectedHeld: string, amount: string) {
    return this._chain.deposit(channelId, expectedHeld, amount);
  }
  getChainInfo(channelId: string) {
    return this._chain.getChainInfo(channelId);
  }
}
