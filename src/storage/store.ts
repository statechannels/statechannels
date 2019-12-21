import {State} from '@statechannels/wallet-protocols';
import {getChannelId, SignedState, Outcome} from '@statechannels/nitro-protocol/src';
import {
  AddressableMessage,
  FundingStrategyProposed
} from '@statechannels/wallet-protocols/lib/wire-protocol';
import {ChannelStoreEntry} from './channel-store-entry';
import {Participant, IStore} from '@statechannels/wallet-protocols/lib/store';

export class Store implements IStore {
  public static equals(left: any, right: any) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private _store: ChannelStore;
  private _privateKeys: Record<string, string>;
  private _nonces: Record<string, string> = {};

  constructor(args?) {
    const {store, privateKeys, nonces} = args || {};
    this._store = store || {};
    this._privateKeys = privateKeys || {};
  }

  public getEntry(channelId: string): ChannelStoreEntry {
    if (!this._store[channelId]) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return new ChannelStoreEntry(this._store[channelId]);
  }

  public maybeGetEntry(channelId: string): ChannelStoreEntry | false {
    const entry = this._store[channelId];
    return !!entry && new ChannelStoreEntry(entry);
  }

  public getPrivateKey(participantIds: string[]): string {
    const myId = participantIds.find(id => this._privateKeys[id]);
    if (!myId) {
      throw new Error(`No private key found for ${myId}`);
    }
    return this._privateKeys[myId];
  }

  public getIndex(channelId: string): 0 | 1 {
    const entry = this.getEntry(channelId);
    const {participants} = entry.states[0].state.channel;
    if (participants.length !== 2) {
      throw new Error('Assumes two participants');
    }

    const ourAddress = `addressFrom${entry.privateKey}`;
    return participants.indexOf(ourAddress) as 0 | 1;
  }

  public findLedgerChannelId(participantIds: string[]): string | undefined {
    for (const channelId in this._store) {
      const entry = this.getEntry(channelId);
      if (
        entry.supportedState[0].state.appDefinition === undefined &&
        // TODO: correct array equality
        this.participantIds(channelId) === participantIds
      ) {
        return channelId;
      }
    }
  }

  public participantIds(channelId: string): string[] {
    return this.getEntry(channelId).participants.map(p => p.participantId);
  }

  public getLatestState(channelId) {
    const {supportedState, unsupportedStates} = this.getEntry(channelId);
    if (unsupportedStates.length) {
      return unsupportedStates.map(s => s.state).sort(s => -s.turnNum)[0];
    } else {
      return supportedState[supportedState.length - 1].state;
    }
  }

  public getLatestSupportedAllocation(channelId): Allocation {
    // TODO: Check the use of this. (Sometimes you want the latest outcome)
    const {outcome} = this.getLatestState(channelId);
    return checkThat(outcome, isAllocation);
  }

  public getLatestConsensus(channelId: string) {
    const {supportedState} = this.getEntry(channelId);
    if (supportedState.length !== 1) {
      throw new Error('Support contains multiple states');
    }
    return supportedState[0];
  }

  public getLatestSupport(channelId: string) {
    return this.getEntry(channelId).supportedState;
  }
  public getUnsupportedStates(channelId: string) {
    return this.getEntry(channelId).unsupportedStates;
  }

  public signedByMe(state: State) {
    const {states} = this.getEntry(getChannelId(state.channel));
    const signedState = states.find((s: SignedState) => Store.equals(state, s.state));

    return !!signedState && !!signedState.signatures && signedState.signatures.includes('first');
  }

  public initializeChannel(data: IChannelStoreEntry) {
    const entry = new ChannelStoreEntry(data);
    if (this._store[entry.channelId]) {
      throw new Error(`Channel ${JSON.stringify(entry.channel)} already initialized`);
    }

    const {participants, channelNonce} = entry.channel;
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
    const signedStates: SignedState[] = [this.signState(state)];
    this.updateOrCreateEntry(channelId, signedStates);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'SendStates',
      signedStates,
      to: 'BLANK'
    };
    this.sendMessage(message, this.recipients(state));
  }

  public sendOpenChannel(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelId(state.channel);

    // 2. Sign & store the state
    const signedState: SignedState = this.signState(state);
    const newEntry = this.updateOrCreateEntry(channelId, [signedState]);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'OPEN_CHANNEL',
      signedState,
      to: 'BLANK'
    };

    this.sendMessage(message, newEntry.recipients);
  }

  public sendStrategyChoice(message: FundingStrategyProposed) {
    const {recipients} = this.getEntry(message.targetChannelId);
    this.sendMessage(message, recipients);
  }

  private recipients(state: State): string[] {
    const privateKey = this.getPrivateKey(state.channel.participants);
    return state.channel.participants.filter(p => p !== privateKey);
  }

  private sendMessage(message: any, recipients: string[]) {
    recipients.forEach(to => messageService.sendMessage({...message, to}));
  }

  public receiveStates(signedStates: SignedState[]): void {
    const {channel} = signedStates[0].state;
    const channelId = getChannelId(channel);

    // TODO: validate transition
    this.updateOrCreateEntry(channelId, signedStates);
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
  // PRIVATE

  private signState(state: State): SignedState {
    return {
      state,
      signatures: [this.getEntry(getChannelId(state.channel)).privateKey]
    };
  }

  private updateOrCreateEntry(channelId: string, states: SignedState[]): ChannelStoreEntry {
    // TODO: This currently assumes that support comes from consensus on a single state
    let supportedState: SignedState[] = [];
    let unsupportedStates: SignedState[] = [];
    const entry = this.maybeGetEntry(channelId);
    if (entry) {
      ({supportedState, unsupportedStates} = entry);
    } else {
      const {participants, channelNonce} = states[0].state.channel;
      this.useNonce(participants, channelNonce);
    }

    unsupportedStates = merge(unsupportedStates, states);

    const nowSupported = unsupportedStates.filter(supported).sort(s => -s.state.turnNum);

    supportedState = nowSupported.length ? [nowSupported[0]] : supportedState;
    if (supportedState.length > 0) {
      unsupportedStates = unsupportedStates.filter(
        s => s.state.turnNum > supportedState[0].state.turnNum
      );
    }

    if (entry) {
      this._store[channelId] = {
        ...this._store[channelId],
        supportedState,
        unsupportedStates
      };
    } else {
      const {channel} = states[0].state;
      const {participants} = channel;
      const entryParticipants: Participant[] = participants.map(p => ({
        destination: p,
        signingAddress: p,
        participantId: p
      }));
      const privateKey = this.getPrivateKey(participants);
      this._store[channelId] = {
        supportedState,
        unsupportedStates,
        privateKey,
        participants: entryParticipants,
        channel
      };
    }

    return new ChannelStoreEntry(this._store[channelId]);
  }
}

function merge(left: SignedState[], right: SignedState[]): SignedState[] {
  // TODO this is horribly inefficient
  right.map(rightState => {
    const idx = left.findIndex(s => Store.equals(s.state, rightState.state));
    const leftState = left[idx];
    if (leftState) {
      const signatures = [...new Set(leftState.signatures.concat(rightState.signatures))];
      left[idx] = {...leftState, signatures};
    } else {
      left.push(rightState);
    }
  });

  return left;
}

function supported(signedState: SignedState) {
  // TODO: temporarily just check the required length
  return (
    signedState.signatures.filter(Boolean).length === signedState.state.channel.participants.length
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

export function isAllocation(outcome: Outcome): outcome is Allocation {
  // TODO: I think this might need to be isEthAllocation (sometimes?)
  if ('target' in outcome) {
    return false;
  }
  return true;
}

const throwError = (fn: (t1: any) => boolean, t) => {
  throw new Error(`not valid, ${fn.name} failed on ${t}`);
};
type TypeGuard<T> = (t1: any) => t1 is T;
export function checkThat<T>(t, isTypeT: TypeGuard<T>): T {
  if (!isTypeT(t)) {
    throwError(isTypeT, t);
  }
  return t;
}
