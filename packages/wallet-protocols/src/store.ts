import { EventEmitter } from 'events';

import * as rxjs from 'rxjs';
import { State, getStateSignerAddress, signState } from '@statechannels/nitro-protocol';
import _ from 'lodash';
import { AddressZero } from 'ethers/constants';
import { hashState } from '@statechannels/nitro-protocol/lib/src/contract/state';
import { map, filter } from 'rxjs/operators';

import { ChannelStoreEntry, IChannelStoreEntry, Funding, supported } from './ChannelStoreEntry';
import { messageService, IMessageService } from './messaging';
import { AddressableMessage, FundingStrategyProposed } from './wire-protocol';
import { Chain, IChain, ChainEventType, ChainEvent } from './chain';
import { add, gt } from './mathOps';

import { getChannelId, SignedState, unreachable, statesEqual } from '.';

export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  channelId: string;
  entry: IChannelStoreEntry;
}
export type StoreEvent = ChainEvent | ChannelUpdated;
export type StoreEventType = ChainEventType | ChannelUpdated['type'];
export type StoreEventListener = (event: StoreEvent) => void;

export interface Store {
  getEntry(channelId: string): ChannelStoreEntry;
  getParticipant(signingAddress: string): Participant;
  getHoldings: IChain['getHoldings'];

  findLedgerChannelId(participants: string[]): string | undefined;
  signedByMe(state: State): boolean;
  getPrivateKey(signingAddresses: string[]): string;
  // TODO: Temporary until we figure a better way of dealing with assetholderaddress
  readonly ethAssetHolderAddress: string;
  /*
  Store modifiers
  */
  deposit: IChain['deposit'];
  initializeChannel(entry: IChannelStoreEntry): void;
  sendState(state: State): void;
  sendOpenChannel(state: State): void;
  receiveStates(signedStates: SignedState[]): void;
  setFunding(channelId: string, funding: Funding): Promise<void>;
  sendStrategyChoice(message: FundingStrategyProposed);
  // TODO: set funding
  // setFunding(channelId: string, funding: Funding): void;
  on: (
    eventType: StoreEventType,
    listener: StoreEventListener
  ) => <T extends StoreEvent>(event: T) => void;
  signState(state: State): SignedState;

  getNextNonce(participants: string[]): string;
  useNonce(participants: string[], nonce): void;
  nonceOk(participants: string[], nonce: string): boolean;
}

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}
export interface ChannelStore {
  [channelId: string]: IChannelStoreEntry;
}

export type Constructor = Partial<{
  store: ChannelStore;
  privateKeys: Record<string, string>;
  nonces: Record<string, string>;
  chain: IChain;
  messagingService: IMessageService;
  ethAssetHolderAddress: string;
}>;
export class EphemeralStore implements Store {
  public static equals(left: SignedState[], right: SignedState[]) {
    // TODO: Delete this; we should use statesEqual and outcomesEqual
    return _.isEqual(
      _.sortBy(left, s => hashState(s.state)),
      _.sortBy(right, s => hashState(s.state))
    );
  }

  private _store: ChannelStore;
  private _privateKeys: Record<string, string>;
  private _nonces: Record<string, string> = {};
  private _eventEmitter = new EventEmitter();
  protected _chain: IChain;
  protected _messagingService: IMessageService;
  private _ethAssetHolderAddress: string;

  constructor(args?: Constructor) {
    const { store, privateKeys } = args || {};
    this._store = store || {};
    this._privateKeys = privateKeys || {};

    // TODO: We probably shouldn't default to test implementations
    this._chain = args?.chain || new Chain();
    this._messagingService = args?.messagingService || messageService;
    this._ethAssetHolderAddress = args?.ethAssetHolderAddress || AddressZero;
    this._chain // TODO: Bad form to call an async method in the constructor?
      .initialize();
  }
  public get ethAssetHolderAddress() {
    return this._ethAssetHolderAddress;
  }
  public async getHoldings(channelId: string) {
    return await this._chain.getHoldings(channelId);
  }
  public on(eventType: StoreEventType, listener: StoreEventListener) {
    switch (eventType) {
      case 'CHANNEL_UPDATED':
        this._eventEmitter.addListener(eventType, listener);
        return () => {
          this._eventEmitter.removeListener(eventType, listener);
        };
      case 'DEPOSITED':
      case 'REVERT':
        return this._chain.on(eventType, listener);
      default:
        return unreachable(eventType);
    }
  }

  public async deposit(channelId: string, expectedHeld: string, amount: string) {
    return await this._chain.deposit(channelId, expectedHeld, amount);
  }

  public async setFunding(channelId, funding: Funding) {
    const entry = this.getEntry(channelId);
    if (entry.funding) throw `Channel ${channelId} already funded`;
    this._store[channelId] = { ...entry.args, funding };
  }

  public getEntry(channelId: string): ChannelStoreEntry {
    if (!this._store[channelId]) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return new ChannelStoreEntry(this._store[channelId]);
  }

  public getParticipant(signingAddress: string): Participant {
    const p = _.flatten(Object.values(this._store).map(e => e.participants)).find(
      p => p.signingAddress === signingAddress
    );
    if (!p) {
      throw 'No participant found';
    }
    return p;
  }

  public getPrivateKey(signingAddresses: string[]): string {
    const myAddress = signingAddresses.find(id => this._privateKeys[id]);
    if (!myAddress) {
      throw new Error(`No private key found for ${myAddress}`);
    }
    return this._privateKeys[myAddress];
  }

  public findLedgerChannelId(participantIds: string[]): string | undefined {
    for (const channelId in this._store) {
      const entry = this.getEntry(channelId);
      if (
        entry.latestSupportedState.appDefinition === undefined &&
        // TODO: correct array equality
        entry.participants.map(p => p.participantId) === participantIds
      ) {
        return channelId;
      }
    }
    return undefined;
  }

  public signedByMe(state: State) {
    const { states, ourAddress } = this.getEntry(getChannelId(state.channel));
    const signedState = states.find((s: SignedState) => statesEqual(state, s.state));

    return !!signedState?.signatures.find(
      signature => getStateSignerAddress({ ...signedState, signature }) === ourAddress
    );
  }

  public initializeChannel(data: IChannelStoreEntry) {
    const entry = new ChannelStoreEntry(data);
    if (this._store[entry.channelId]) {
      throw new Error(`Channel ${JSON.stringify(entry.channel)} already initialized`);
    }

    const { participants, channelNonce } = entry.channel;
    if (this.nonceOk(participants, channelNonce)) {
      this._store[entry.channelId] = entry.args;
      this.useNonce(participants, channelNonce);
    } else {
      throw new Error('Nonce used for these participants');
    }
  }

  public sendState(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelId(state.channel);

    // 2. Sign & store the state
    const { recipients, states } = this.updateEntry(channelId, [this.signState(state)]);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'SendStates',
      signedStates: states,
      to: 'BLANK',
    };
    this.sendMessage(message, recipients);
  }

  public sendOpenChannel(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelId(state.channel);

    // 2. Sign & store the state
    const signedState: SignedState = this.signState(state);
    const { recipients, participants } = this.updateEntry(channelId, [signedState]);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'OPEN_CHANNEL',
      signedState,
      participants,
      to: 'BLANK',
    };

    this.sendMessage(message, recipients);
  }

  public sendStrategyChoice(message: FundingStrategyProposed) {
    const { recipients } = this.getEntry(message.targetChannelId);
    this.sendMessage(message, recipients);
  }
  public signState(state: State): SignedState {
    const { privateKey } = this.getEntry(getChannelId(state.channel));

    return {
      state,
      signatures: [signState(state, privateKey).signature],
    };
  }

  protected sendMessage(message: any, recipients: string[]) {
    recipients.forEach(to => this._messagingService.sendMessage({ ...message, to }));
  }

  public receiveStates(signedStates: SignedState[]): void {
    const { channel } = signedStates[0].state;
    const channelId = getChannelId(channel);

    // TODO: validate transition
    this.updateEntry(channelId, signedStates);
  }

  // Nonce management

  private key(participants: string[]): string {
    return JSON.stringify(participants);
  }

  public getNextNonce(participants: string[]): string {
    return add(1, this._nonces[this.key(participants)]);
  }

  public useNonce(participants: string[], nonce: string): boolean {
    if (this.nonceOk(participants, nonce)) {
      this._nonces[this.key(participants)] = nonce;
      return true;
    } else {
      throw new Error("Can't use this nonce");
    }
  }

  public nonceOk(participants: string[], nonce: string): boolean {
    return gt(nonce, this._nonces[this.key(participants)] || -1);
  }

  protected updateEntry(channelId: string, states: SignedState[]): ChannelStoreEntry {
    const entry = this.getEntry(channelId);
    const newEntry = { ...entry, states: merge(states, entry.states) };
    this._store[channelId] = newEntry;
    if (!EphemeralStore.equals(entry.states, newEntry.states)) {
      const channelUpdated: ChannelUpdated = {
        type: 'CHANNEL_UPDATED',
        channelId,
        entry: newEntry, // Send the updated entry
      };
      this._eventEmitter.emit(channelUpdated.type, channelUpdated);
    }
    return new ChannelStoreEntry(newEntry);
  }
}

// For subscriber convenience, construct a ChannelStoreEntry
type T = { type: ChannelUpdated['type']; channelId: string; entry: ChannelStoreEntry };
export function observeChannel(store: Store, channelId: string): rxjs.Observable<T> {
  const firstEntry: Promise<ChannelUpdated | { type: 'NOT_FOUND' }> = new Promise(resolve => {
    try {
      const entry = store.getEntry(channelId);
      resolve({ type: 'CHANNEL_UPDATED', channelId: entry.channelId, entry });
    } catch (e) {
      resolve({ type: 'NOT_FOUND' });
    }
  });

  const currentState = rxjs
    .from(firstEntry)
    .pipe(filter((e): e is T => e.type === 'CHANNEL_UPDATED'));

  const updates = new rxjs.Observable(observer => {
    store.on('CHANNEL_UPDATED', val => observer.next(val));
  }).pipe(
    // TODO: How do we corretcly type `store.on` so that the piped values are the correct type?
    map((e: ChannelUpdated) => ({
      ...e,
      entry: new ChannelStoreEntry(e.entry),
    })),
    filter(e => e.channelId === channelId)
  );

  return rxjs.merge(currentState, updates);
}

export function merge(left: SignedState[], right: SignedState[]): SignedState[] {
  // TODO this is horribly inefficient

  right.map(rightState => {
    const idx = left.findIndex(s => statesEqual(s.state, rightState.state));
    const leftState = left[idx];
    if (leftState) {
      const signatures = _.uniqBy(leftState.signatures.concat(rightState.signatures), s => s.r);
      left[idx] = { ...leftState, signatures };
    } else {
      left.push(rightState);
    }
  });

  return left.filter(
    s => s.state.turnNum >= Math.max(...left.filter(supported).map(s => s.state.turnNum))
  );
}
