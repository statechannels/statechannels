import {BaseProcessAction} from "../actions";
import {strategyApproved, StrategyApproved} from "../../../communication";
export {strategyApproved, StrategyApproved};
import {ActionConstructor} from "../../utils";
import {AdvanceChannelAction, isAdvanceChannelAction} from "../advance-channel";
import {EngineAction} from "../../actions";
import {VirtualFundingAction, isVirtualFundingAction} from "../virtual-funding";
import {LedgerFundingAction, isLedgerFundingAction} from "../ledger-funding";
import {FundingStrategyNegotiationAction, isFundingStrategyNegotiationAction} from "../funding-strategy-negotiation";

// -------
// Actions
// -------

export interface FundingSuccessAcknowledged extends BaseProcessAction {
  type: "ENGINE.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED";
}

// --------
// Constructors
// --------

export const fundingSuccessAcknowledged: ActionConstructor<FundingSuccessAcknowledged> = p => ({
  ...p,
  type: "ENGINE.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED"
});

// -------
// Unions and Guards
// -------
export function isFundingAction(action: EngineAction): action is FundingAction {
  return (
    action.type === "ENGINE.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED" ||
    isAdvanceChannelAction(action) ||
    isVirtualFundingAction(action) ||
    isLedgerFundingAction(action) ||
    isFundingStrategyNegotiationAction(action)
  );
}

export type FundingAction =
  | FundingSuccessAcknowledged
  | AdvanceChannelAction
  | VirtualFundingAction
  | LedgerFundingAction
  | FundingStrategyNegotiationAction;
