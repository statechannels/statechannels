import { ChannelState, SignedState } from '.';

interface Store {
  getLatestState: (channelId: string) => ChannelState;
  getLatestSupportState: (channelId: string) => SignedState; // Support in null channels must be a single state
  getLatestSupportChain: (channelId: string) => SignedState[]; //  Application channels would typically have multiple states in its support
  getUnsupportedStates: (channelID: string) => SignedState[];

  signedByMe: (state: ChannelState) => boolean;
  sendState: (state: ChannelState) => void;
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
