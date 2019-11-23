import { AppData, RoundProposed, RoundAccepted, Reveal, Start } from './app-data';

export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

export interface ChannelState<T = AppData> {
  channelId: string;
  turnNum: string;
  status: ChannelStatus;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: string;
  bBal: string;
  appData: T;
}

export const isClosed = (state?: ChannelState): state is ChannelState =>
  (state && state.status === 'closed') || false;

export const isEmpty = (state?: ChannelState): state is undefined => !state;

export const inChannelProposed = (state?: ChannelState): state is ChannelState =>
  (state && state.status === 'proposed') || false;

export const isRunning = (state?: ChannelState): state is ChannelState =>
  (state && state.status === 'running') || false;

export const inRoundProposed = (state?: ChannelState): state is ChannelState<RoundProposed> =>
  (state && state.appData.type === 'roundProposed') || false;

export const inRoundAccepted = (state?: ChannelState): state is ChannelState<RoundAccepted> =>
  (state && state.appData.type === 'roundAccepted') || false;

export const inReveal = (state?: ChannelState): state is ChannelState<Reveal> =>
  (state && state.appData.type === 'reveal') || false;

export const inStart = (state?: ChannelState): state is ChannelState<Start> =>
  (state && state.appData.type === 'start') || false;
