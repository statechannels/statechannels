import {EngineAction} from "../../actions";
import {WithdrawalAction, isWithdrawalAction} from "../withdrawing/actions";
import {AdvanceChannelAction, isAdvanceChannelAction} from "../advance-channel";

// -------
// Actions
// -------

// -------
// Constructors
// -------

// -------
// Unions and Guards
// -------

export type CloseLedgerChannelAction = WithdrawalAction | AdvanceChannelAction;

export const isCloseLedgerChannelAction = (action: EngineAction): action is CloseLedgerChannelAction => {
  return isWithdrawalAction(action) || isAdvanceChannelAction(action);
};
