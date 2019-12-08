import {
  add,
  Allocation,
  getChannelID,
  gt,
  Outcome,
  SignedState,
  State,
} from '.';
import { ChannelStoreEntry, IChannelStoreEntry } from './ChannelStoreEntry';
import { messageService } from './messaging';
import { AddressableMessage, OpenChannel } from './wire-protocol';
interface IStore {
  getLatestState: (channelID: string) => State;
  getLatestConsensus: (channelID: string) => SignedState; // Used for null channels, whose support must be a single state
  getLatestSupport: (channelID: string) => SignedState[]; //  Used for application channels, which would typically have multiple states in its support
  getLatestSupportedAllocation: (channelID: string) => Allocation;
  getEntry: (channelID: string) => ChannelStoreEntry;
  getIndex: (channelId: string) => 0 | 1;

  // The channel store should garbage collect stale states on CHANNEL_UPDATED events.
  // If a greater state becomes supported on such an event, it should replace the latest
  // supported state, and remove any lesser, unsupported states.
  getUnsupportedStates: (channelID: string) => SignedState[];

  findLedgerChannelId: (participants: string[]) => string | undefined;
  signedByMe: (state: State) => boolean;
  getPrivateKey: (participantIds: string[]) => string;

  /*
  Store modifiers
  */
  initializeChannel: (entry: ChannelStoreEntry) => void;
  sendState: (state: State) => void;
  sendOpenChannel: (state: State) => void;
  receiveStates: (signedStates: SignedState[]) => void;

  // TODO: set funding
  // setFunding(channelId: string, funding: Funding): void;

  /*
  Nonce management
  ----------------
  Wallet stores should implement a getNextNonce method that is deterministic in the
  "happy path". 
  This may change, which would require nonce-negotiation by default in protocols that create
  new channels.

  For example, say each wallet keeps track of the largest nonce used by a given
  set of participants. Then `getNextNonce` returns one more than the largest current nonce.
  In the absence of dropped messages, this returns the same value in any two wallets.

  Protocols which use new nonces need to have a safeguard against disagreement in the case of
  unexpected circumstances.
  The `useNonce` method can be used by a protocol to force the use of a nonce other than
  the output of `getNextNonce`. It update the store if the nonce is safe, and throw if the nonce
  is unsafe.
  */
  getNextNonce(participants: string[]): string;
  useNonce(participants: string[], nonce): void;
  nonceOk(participants: string[], nonce: string): boolean;
}

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}

interface ChannelStore {
  [channelID: string]: IChannelStoreEntry;
}

type Constructor = Partial<{
  store: ChannelStore;
  privateKeys: Record<string, string>;
  nonces: Record<string, string>;
}>;
export class Store implements IStore {
  public static equals(left: any, right: any) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private _store: ChannelStore;
  private _nonces: Record<string, string>;
  private _privateKeys: Record<string, string>;

  constructor(args?: Constructor) {
    const { store, privateKeys, nonces } = args || {};
    this._store = store || {};
    this._privateKeys = privateKeys || {};
    this._nonces = nonces || {};
  }

  public getEntry(channelID: string): ChannelStoreEntry {
    if (!this._store[channelID]) {
      throw new Error(`Channel ${channelID} not found`);
    }

    return new ChannelStoreEntry(this._store[channelID]);
  }

  public maybeGetEntry(channelID: string): ChannelStoreEntry | false {
    const entry = this._store[channelID];
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
    const { participants } = entry.states[0].state.channel;
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

  public getLatestState(channelID) {
    const { supportedState, unsupportedStates } = this.getEntry(channelID);
    if (unsupportedStates.length) {
      return unsupportedStates.map(s => s.state).sort(s => -s.turnNum)[0];
    } else {
      return supportedState[supportedState.length - 1].state;
    }
  }

  public getLatestSupportedAllocation(channelID): Allocation {
    // TODO: Check the use of this. (Sometimes you want the latest outcome)
    const { outcome } = this.getLatestState(channelID);
    return checkThat(outcome, isAllocation);
  }

  public getLatestConsensus(channelID: string) {
    const { supportedState } = this.getEntry(channelID);
    if (supportedState.length !== 1) {
      throw new Error('Support contains multiple states');
    }
    return supportedState[0];
  }

  public getLatestSupport(channelID: string) {
    return this.getEntry(channelID).supportedState;
  }
  public getUnsupportedStates(channelID: string) {
    return this.getEntry(channelID).unsupportedStates;
  }

  public signedByMe(state: State) {
    const { states } = this.getEntry(getChannelID(state.channel));
    const signedState = states.find((s: SignedState) =>
      Store.equals(state, s.state)
    );

    return (
      !!signedState &&
      !!signedState.signatures &&
      signedState.signatures.includes('first')
    );
  }

  public initializeChannel(data: IChannelStoreEntry) {
    const entry = new ChannelStoreEntry(data);
    if (this._store[entry.channelId]) {
      throw new Error('Channel already initialized');
    }

    this._store[entry.channelId] = entry.args;
  }

  public sendState(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelID(state.channel);

    // 2. Sign & store the state
    const { privateKey: signature } = this.getEntry(channelId);
    const signedStates: SignedState[] = [{ state, signatures: [signature] }];
    this.updateOrCreateEntry(channelId, signedStates);

    // 3. Look up recipients
    // TODO
    const recipients = state.channel.participants;

    // 4. Send the message
    const message: AddressableMessage = {
      type: 'SendStates',
      signedStates,
      to: 'BLANK',
    };
    recipients.forEach(to => messageService.sendMessage({ ...message, to }));
  }

  public sendOpenChannel(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelID(state.channel);

    // 2. Sign & store the state
    const signedState: SignedState = this.signState(state);
    const newEntry = this.updateOrCreateEntry(channelId, [signedState]);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'OPEN_CHANNEL',
      signedState,
      to: 'BLANK',
    };
    newEntry.recipients.forEach(to =>
      messageService.sendMessage({ ...message, to })
    );
  }

  public receiveStates(signedStates: SignedState[]): void {
    try {
      const { channel } = signedStates[0].state;
      const channelID = getChannelID(channel);

      // TODO: validate transition
      this.updateOrCreateEntry(channelID, signedStates);
    } catch (e) {
      throw e;
    }
  }

  // Nonce management
  private key(participants: string[]): string {
    return JSON.stringify(participants);
  }
  public getNextNonce(participants: string[]): string {
    const key = this.key(participants);
    return (this._nonces[key] = add(this._nonces[key] || 0, '0x01'));
  }
  public useNonce(participants: string[], nonce: string): void {
    if (this.nonceOk(participants, nonce)) {
      this._nonces[this.key(participants)] = nonce;
    } else {
      throw new Error('Bad nonce');
    }
  }
  public nonceOk(participants: string[], nonce: string): boolean {
    return gt(nonce, this._nonces[this.key(participants)] || -1);
  }

  // PRIVATE

  private signState(state: State): SignedState {
    console.log(
      `signing ${state.turnNum} with key ${
        this.getEntry(getChannelID(state.channel)).privateKey
      }`
    );

    return {
      state,
      signatures: [this.getEntry(getChannelID(state.channel)).privateKey],
    };
  }

  private updateOrCreateEntry(
    channelID: string,
    states: SignedState[]
  ): ChannelStoreEntry {
    // TODO: This currently assumes that support comes from consensus on a single state
    let supportedState: SignedState[] = [];
    let unsupportedStates: SignedState[] = [];
    const entry = this.maybeGetEntry(channelID);
    if (entry) {
      ({ supportedState, unsupportedStates } = entry);
    }

    unsupportedStates = merge(unsupportedStates, states);

    const nowSupported = unsupportedStates
      .filter(supported)
      .sort(s => -s.state.turnNum);

    supportedState = nowSupported.length ? [nowSupported[0]] : supportedState;
    if (supportedState.length > 0) {
      unsupportedStates = unsupportedStates.filter(
        s => s.state.turnNum > supportedState[0].state.turnNum
      );
    }

    if (entry) {
      this._store[channelID] = {
        ...this._store[channelID],
        supportedState,
        unsupportedStates,
      };
    } else {
      const { channel } = states[0].state;
      const { participants } = channel;
      const entryParticipants: Participant[] = participants.map(p => ({
        destination: p,
        signingAddress: p,
        participantId: p,
      }));
      const privateKey = this.getPrivateKey(participants);
      this._store[channelID] = {
        supportedState,
        unsupportedStates,
        privateKey,
        participants: entryParticipants,
        channel,
      };
    }

    console.log(
      `Latest state signatures: ${supportedState.length &&
        supportedState[0].signatures}`
    );

    return new ChannelStoreEntry(this._store[channelID]);
  }
}

function merge(left: SignedState[], right: SignedState[]): SignedState[] {
  // TODO this is horribly inefficient
  right.map(rightState => {
    const idx = left.findIndex(s => Store.equals(s.state, rightState.state));
    const leftState = left[idx];
    if (leftState) {
      const signatures = [
        ...new Set(leftState.signatures.concat(rightState.signatures)),
      ];
      left[idx] = { ...leftState, signatures };
    } else {
      left.push(rightState);
    }
  });

  return left;
}

function supported(signedState: SignedState) {
  // TODO: temporarily just check the required length
  return (
    signedState.signatures.filter(Boolean).length ===
    signedState.state.channel.participants.length
  );
}

// The store would send this action whenever the channel is updated
export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  channelId: string;
}

export interface Deposit {
  type: 'DEPOSIT';
  channelID: string;
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
