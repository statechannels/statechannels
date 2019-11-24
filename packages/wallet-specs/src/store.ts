import { ChannelState, SignedState } from '.';

interface IStore {
  getLatestState: (channelID: string) => ChannelState;
  getLatestConsensus: (channelID: string) => SignedState; // Used for null channels, whose support must be a single state
  getLatestSupport: (channelID: string) => SignedState[]; //  Used for application channels, which would typically have multiple states in its support

  // The channel store should garbage collect stale states on CHANNEL_UPDATED events.
  // If a greater state becomes supported on such an event, it should replace the latest
  // supported state, and remove any lesser, unsupported states.
  getUnsupportedStates: (channelID: string) => SignedState[];

  signedByMe: (state: ChannelState) => boolean;
  sendState: (state: ChannelState) => void;

  // Helpers
  equals: (left: ChannelState, right: ChannelState) => boolean;
}

export const store = (null as any) as Store;

interface ChannelStoreEntry {
  supportedState: SignedState[];
  unsupportedStates: SignedState[];
  privateKey: string;
}

interface ChannelStore {
  [channelID: string]: ChannelStoreEntry;
}

class Store implements IStore {
  private _store: ChannelStore;
  constructor(initialStore: ChannelStore = {}) {
    this._store = initialStore;
  }

  public getLatestState(channelID) {
    const { supportedState, unsupportedStates } = this.getEntry(channelID);
    if (unsupportedStates.length) {
      return unsupportedStates.map(s => s.state).sort(s => -s.turnNumber)[0];
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

  public signedByMe(state: ChannelState) {
    const signedState = this.states(state.channelID).find((s: SignedState) =>
      this.equals(state, s.state)
    );

    return (
      !!signedState &&
      !!signedState.signatures &&
      signedState.signatures.includes('me')
    );
  }

  public sendState(state: ChannelState) {
    // TODO
  }

  public equals(left: ChannelState, right: ChannelState) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  // PRIVATE

  private states(channelID: string): SignedState[] {
    const entry = this.getEntry(channelID);

    return entry.unsupportedStates.concat(entry.supportedState);
  }

  private getEntry(channelID: string): ChannelStoreEntry {
    if (!this._store[channelID]) {
      throw new Error(`Channel ${channelID} not found`);
    }

    return this._store[channelID];
  }
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
