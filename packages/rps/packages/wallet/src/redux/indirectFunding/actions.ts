import * as playerA from './playerA/actions';
import * as playerB from './playerB/actions';
import { CommonAction } from '../actions';
import { PlayerIndex } from '../types';

export const FUNDING_REQUESTED = 'WALLET.INDIRECT_FUNDING.FUNDING_REQUESTED';
export const fundingRequested = (channelId: string, playerIndex: PlayerIndex) => ({
  type: FUNDING_REQUESTED as typeof FUNDING_REQUESTED,
  channelId,
  playerIndex,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;

export { playerA, playerB };
export type Action = FundingRequested | playerA.Action | playerB.Action | CommonAction;
