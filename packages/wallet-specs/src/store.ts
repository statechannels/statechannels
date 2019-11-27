import { getChannelID, SignedState, State } from '.';

interface IStore {
  getLatestState: (channelID: string) => State;
  getLatestConsensus: (channelID: string) => SignedState; // Used for null channels, whose support must be a single state
  getLatestSupport: (channelID: string) => SignedState[]; //  Used for application channels, which would typically have multiple states in its support

  // The channel store should garbage collect stale states on CHANNEL_UPDATED events.
  // If a greater state becomes supported on such an event, it should replace the latest
  // supported state, and remove any lesser, unsupported states.
  getUnsupportedStates: (channelID: string) => SignedState[];

  getEntry: (channelID: string) => ChannelStoreEntry;
  findLedgerChannelId: (targetChannelId: string) => string | undefined;

  signedByMe: (state: State) => boolean;
  sendState: (state: State) => void;
  receiveStates: (signedStates: SignedState[]) => ChannelUpdated | false;
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
  public static equals(left: State, right: State) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private _store: ChannelStore;

  constructor(initialStore: ChannelStore = {}) {
    this._store = initialStore;
  }

  public getEntry(channelID: string): ChannelStoreEntry {
    if (!this._store[channelID]) {
      throw new Error(`Channel ${channelID} not found`);
    }

    return this._store[channelID];
  }

  public findLedgerChannelId(targetChannelId: string): string | undefined {
    const participantIds = this.participantIds(targetChannelId);
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
