import { State } from '@statechannels/nitro-protocol';
import { getStateSignerAddress, signState } from '@statechannels/nitro-protocol/lib/src/signatures';
import _ from 'lodash';

import { ChannelStoreEntry, IChannelStoreEntry, supported, Funding } from './ChannelStoreEntry';
import { messageService } from './messaging';
import { AddressableMessage, FundingStrategyProposed } from './wire-protocol';
import { Chain, IChain } from './chain';

import { add, getChannelId, gt, SignedState } from '.';
export interface IStore {
  getEntry(channelId: string): ChannelStoreEntry;
  getParticipant(signingAddress: string): Participant;
  getHoldings: IChain['getHoldings'];

  findLedgerChannelId(participants: string[]): string | undefined;
  signedByMe(state: State): boolean;
  getPrivateKey(signingAddresses: string[]): string;

  /*
  Store modifiers
  */
  deposit: IChain['deposit'];
  initializeChannel(entry: ChannelStoreEntry): void;
  sendState(state: State): void;
  sendOpenChannel(state: State): void;
  receiveStates(signedStates: SignedState[]): void;
  setFunding(channelId: string, funding: Funding): Promise<void>;

  // TODO: set funding
  // setFunding(channelId: string, funding: Funding): void;
  on: IChain['on'];
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
}>;
export class Store implements IStore {
  public static equals(left: any, right: any) {
    // TODO: Delete this; we should use statesEqual and outcomesEqual
    return _.isEqual(left, right);
  }

  private _store: ChannelStore;
  private _privateKeys: Record<string, string>;
  private _nonces: Record<string, string> = {};

  protected _chain: IChain;

  constructor(args?: Constructor) {
    const { store, privateKeys } = args || {};
    this._store = store || {};
    this._privateKeys = privateKeys || {};

    this._chain = args?.chain || new Chain();
    // TODO: Bad form to call an async method in the constructor?
    this._chain.initialize();
  }

  public async getHoldings(channelId: string) {
    return await this._chain.getHoldings(channelId);
  }
  public on(chainEventType, listener) {
    return this._chain.on(chainEventType, listener);
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
    const signedState = states.find((s: SignedState) => Store.equals(state, s.state));

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
    recipients.forEach(to => messageService.sendMessage({ ...message, to }));
  }

  public receiveStates(signedStates: SignedState[]): void {
    try {
      const { channel } = signedStates[0].state;
      const channelId = getChannelId(channel);

      // TODO: validate transition
      this.updateEntry(channelId, signedStates);
    } catch (e) {
      throw e;
    }
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
    this._store[channelId] = { ...entry, states: merge(states, entry.states) };

    return new ChannelStoreEntry(this._store[channelId]);
  }
}

export function merge(left: SignedState[], right: SignedState[]): SignedState[] {
  // TODO this is horribly inefficient

  right.map(rightState => {
    const idx = left.findIndex(s => Store.equals(s.state, rightState.state));
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

// The store would send this action whenever the channel is updated
export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  channelId: string;
}

export interface Deposit {
  type: 'DEPOSIT';
  channelId: string;
  currentAmount: number;
}

export type StoreEvent = ChannelUpdated | Deposit;
