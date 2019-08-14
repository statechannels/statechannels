import * as actions from '../../actions';
import { isCommonAction, EmbeddedProtocol, routerFactory } from '../../../communication';

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

export type DirectFundingAction =
  | actions.CommitmentReceived
  | actions.FundingReceivedEvent
  | EmbeddedAction;

function isEmbeddedAction(action: actions.WalletAction): action is EmbeddedAction {
  return (
    actions.advanceChannel.isAdvanceChannelAction(action) || actions.isTransactionAction(action)
  );
}

export function isDirectFundingAction(action: actions.WalletAction): action is DirectFundingAction {
  return (
    action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' ||
    isCommonAction(action, EmbeddedProtocol.DirectFunding) ||
    isEmbeddedAction(action)
  );
}

export const routesToDirectFunding = routerFactory(
  isDirectFundingAction,
  EmbeddedProtocol.DirectFunding,
);
