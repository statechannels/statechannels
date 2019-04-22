import * as playerA from './player-a/actions';
import * as playerB from './player-b/actions';
import { CommonAction, WalletAction, isCommonAction } from '../../actions';
import { PlayerIndex, WalletProtocol } from '../../types';
import { isDirectFundingAction } from '../direct-funding/actions';

export const FUNDING_REQUESTED = 'WALLET.INDIRECT_FUNDING.FUNDING_REQUESTED';
export const fundingRequested = (channelId: string, playerIndex: PlayerIndex) => ({
  type: FUNDING_REQUESTED as typeof FUNDING_REQUESTED,
  channelId,
  playerIndex,
  protocol: WalletProtocol.IndirectFunding,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;

export { playerA, playerB };
export type ProcessAction = playerA.Action | playerB.Action;
export type Action = FundingRequested | ProcessAction | CommonAction;

export function isIndirectFundingAction(action: WalletAction): action is Action {
  return isCommonAction(action)
    ? true
    : isDirectFundingAction(action)
    ? true
    : action.type.indexOf('WALLET.INDIRECT_FUNDING') === 0
    ? true
    : false;
}
