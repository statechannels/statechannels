import * as actions from '../../actions';

export function isfundingAction(action: actions.WalletAction): action is FundingAction {
  return action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' ||
    actions.internal.isFundingAction(action) ||
    actions.isTransactionAction(action)
    ? true
    : false;
}

export type FundingAction =
  | actions.FundingReceivedEvent
  | actions.internal.InternalFundingAction
  | actions.TransactionAction;
