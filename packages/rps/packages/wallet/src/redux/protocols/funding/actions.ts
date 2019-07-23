import { BaseProcessAction } from '../actions';
import { strategyApproved, StrategyApproved } from '../../../communication';
export { strategyApproved, StrategyApproved };
import { ActionConstructor } from '../../utils';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import { WalletAction } from '../../actions';
import { VirtualFundingAction, isVirtualFundingAction } from '../virtual-funding';
import { IndirectFundingAction, isIndirectFundingAction } from '../indirect-funding';
import {
  FundingStrategyNegotiationAction,
  isFundingStrategyNegotiationAction,
} from '../funding-strategy-negotiation';

// -------
// Actions
// -------

export interface FundingSuccessAcknowledged extends BaseProcessAction {
  type: 'WALLET.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED';
}

// --------
// Constructors
// --------

export const fundingSuccessAcknowledged: ActionConstructor<FundingSuccessAcknowledged> = p => ({
  ...p,
  type: 'WALLET.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------
export function isFundingAction(action: WalletAction): action is FundingAction {
  return (
    action.type === 'WALLET.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED' ||
    isAdvanceChannelAction(action) ||
    isVirtualFundingAction(action) ||
    isIndirectFundingAction(action) ||
    isFundingStrategyNegotiationAction(action)
  );
}

export type FundingAction =
  | FundingSuccessAcknowledged
  | AdvanceChannelAction
  | VirtualFundingAction
  | IndirectFundingAction
  | FundingStrategyNegotiationAction;
