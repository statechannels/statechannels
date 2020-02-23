import {AppData, Start, XPlaying, OPlaying, Draw, Victory} from './app-data';

export type ChannelStatus =
  | 'proposed'
  | 'opening'
  | 'funding'
  | 'running'
  | 'challenging'
  | 'responding'
  | 'closing'
  | 'closed';

export interface ChannelState<T = AppData> {
  channelId: string;
  turnNum: string;
  status: ChannelStatus;
  aUserId: string;
  bUserId: string;
  aAddress: string;
  bAddress: string;
  aOutcomeAddress: string;
  bOutcomeAddress: string;
  aBal: string;
  bBal: string;
  appData: T;
  challengeExpirationTime?: number;
}

export type MaybeChannelState = ChannelState | null;

export const isChallenging = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'challenging') || false;

export const isResponding = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'responding') || false;

export const isChallengingOrResponding = (state: MaybeChannelState): state is ChannelState =>
  isChallenging(state) || isResponding(state);

export const isClosing = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'closing') || false;

export const isClosed = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'closed') || false;

export const isEmpty = (state: MaybeChannelState): state is null => !state;

export const inChannelProposed = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'proposed') || false;

export const isRunning = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'running') || false;

export const inStart = (state: MaybeChannelState): state is ChannelState<Start> =>
  (state && state.appData.type === 'start') || false;

export const inXPlaying = (state: MaybeChannelState): state is ChannelState<XPlaying> =>
  (state && state.appData.type === 'xPlaying') || false;

export const inOPlaying = (state: MaybeChannelState): state is ChannelState<OPlaying> =>
  (state && state.appData.type === 'oPlaying') || false;

export const inDraw = (state: MaybeChannelState): state is ChannelState<Draw> =>
  (state && state.appData.type === 'draw') || false;

export const inVictory = (state: MaybeChannelState): state is ChannelState<Victory> =>
  (state && state.appData.type === 'victory') || false;
