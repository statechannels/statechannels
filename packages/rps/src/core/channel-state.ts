import {AppData, RoundProposed, RoundAccepted, Reveal, Start} from './app-data';

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

export const inRoundProposed = (state: MaybeChannelState): state is ChannelState<RoundProposed> =>
  (state && state.appData.type === 'roundProposed') || false;

export const inRoundAccepted = (state: MaybeChannelState): state is ChannelState<RoundAccepted> =>
  (state && state.appData.type === 'roundAccepted') || false;

export const inReveal = (state: MaybeChannelState): state is ChannelState<Reveal> =>
  (state && state.appData.type === 'reveal') || false;

export const inStart = (state: MaybeChannelState): state is ChannelState<Start> =>
  (state && state.appData.type === 'start') || false;
