import * as actions from "../../actions";
import {isCommonAction, EmbeddedProtocol, routerFactory, CommitmentsReceived} from "../../../communication";

// -------
// Actions
// -------

// -------
// Constructors
// -------
// -------
// Unions and Guards
// -------

type EmbeddedAction = actions.advanceChannel.AdvanceChannelAction | actions.TransactionAction;

export type DirectFundingAction = CommitmentsReceived | actions.FundingReceivedEvent | EmbeddedAction;

function isEmbeddedAction(action: actions.EngineAction): action is EmbeddedAction {
  return actions.advanceChannel.isAdvanceChannelAction(action) || actions.isTransactionAction(action);
}

export function isDirectFundingAction(action: actions.EngineAction): action is DirectFundingAction {
  return (
    action.type === "ENGINE.ADJUDICATOR.FUNDING_RECEIVED_EVENT" ||
    isCommonAction(action, EmbeddedProtocol.DirectFunding) ||
    isEmbeddedAction(action)
  );
}

export const routesToDirectFunding = routerFactory(isDirectFundingAction, EmbeddedProtocol.DirectFunding);
