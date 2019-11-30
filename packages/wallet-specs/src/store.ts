import {
  add,
  Allocation,
  getChannelID,
  gt,
  Outcome,
  SignedState,
  State,
} from '.';
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
  sendState: (state: State) => void;
  receiveStates: (signedStates: SignedState[]) => ChannelUpdated | false;

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

export interface ChannelStoreEntry {
  supportedState: SignedState[];
  unsupportedStates: SignedState[];
  privateKey: string; // determines ourIndex
  participants: Participant[];
}

interface ChannelStore {
  [channelID: string]: ChannelStoreEntry;
}

export class Store implements IStore {
  public static equals(left: any, right: any) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private _store: ChannelStore;
  private _nonces: Record<string, string>;

  constructor(initialStore: ChannelStore = {}) {
    this._store = initialStore;
  }

  public getEntry(channelID: string): ChannelStoreEntry {
    if (!this._store[channelID]) {
      throw new Error(`Channel ${channelID} not found`);
    }

    return this._store[channelID];
  }

  public getIndex(channelId: string): 0 | 1 {
    const entry = this.getEntry(channelId);
    const { participants } = entry.supportedState[0].state.channel;
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
    return store.getEntry(channelId).participants.map(p => p.participantId);
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
    return shouldBe(isAllocation, outcome);
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
    const signedState = this.states(getChannelID(state.channel)).find(
      (s: SignedState) => Store.equals(state, s.state)
    );

    return (
      !!signedState &&
      !!signedState.signatures &&
      signedState.signatures.includes('me')
    );
  }

  public sendState(state: State) {
    this.receiveStates([{ state, signatures: ['mine'] }]);
  }

  public receiveStates(signedStates: SignedState[]): ChannelUpdated | false {
    try {
      const { channel } = signedStates[0].state;
      const channelID = getChannelID(channel);

      // TODO: validate transition
      this.updateEntry(channelID, signedStates);

      return { type: 'CHANNEL_UPDATED', channelID };
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
    return gt(nonce, this._nonces[this.key(participants)]);
  }

  // PRIVATE

  private states(channelID: string): SignedState[] {
    const entry = this.getEntry(channelID);

    return entry.unsupportedStates.concat(entry.supportedState);
  }

  private updateEntry(channelID: string, states: SignedState[]): true {
    // TODO: This currently assumes that support comes from consensus on a single state
    let supportedState: SignedState[];
    let unsupportedStates: SignedState[];
    ({ supportedState, unsupportedStates } = this.getEntry(channelID));

    unsupportedStates = merge(unsupportedStates, states);

    const nowSupported = unsupportedStates
      .filter(supported)
      .sort(s => -s.state.turnNum);

    supportedState = nowSupported.length ? [nowSupported[0]] : supportedState;
    unsupportedStates = unsupportedStates.filter(
      s => s.state.turnNum > supportedState[0].state.turnNum
    );

    this._store[channelID] = {
      ...this._store[channelID],
      supportedState,
      unsupportedStates,
    };

    return true;
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
    signedState.signatures.length ===
    signedState.state.channel.participants.length
  );
}

// The store would send this action whenever the channel is updated
export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  channelID: string;
}

export interface Deposit {
  type: 'DEPOSIT';
  channelID: string;
  currentAmount: number;
}

export type StoreEvent = ChannelUpdated | Deposit;

export const store = new Store();

export function isAllocation(outcome: Outcome): outcome is Allocation {
  // TODO: This should sometimes be isEthAllocation
  if ('target' in outcome) {
    throw new Error('Not an allocation');
  }
  return true;
}

const throwError = (fn: (t1: any) => boolean, t) => {
  throw new Error(`not valid, ${fn.name} failed on ${t}`);
};
export const shouldBe = <T>(fn: (t1) => t1 is T, t) =>
  fn(t) ? t : throwError(fn, t);
