import { ChannelState, SignedState } from '.';

interface Store {
  getLatestState: (channelId: string) => ChannelState;
  getLatestWalletChannelSupport: (channelId: string) => SignedState; // Support in null channels must be a single state
  getLatestAppChannelSupport: (channelId: string) => SignedState[]; //  Application channels would typically have multiple states in its support

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
