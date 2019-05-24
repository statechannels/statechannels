import * as actions from '../../actions';
import { ActionConstructor } from '../../utils';

// -------
// Actions
// -------
export interface DirectFundingRequested {
  type: 'WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED';
  processId;
  channelId;
  totalFundingRequired;
  safeToDepositLevel;
  requiredDeposit;
  ourIndex;
}

// -------
// Constructors
// -------
export const directFundingRequested: ActionConstructor<DirectFundingRequested> = p => ({
  ...p,
  type: 'WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED',
});
// -------
// Unions and Guards
// -------

export type FundingAction =
  | DirectFundingRequested
  | actions.CommitmentReceived
  | actions.FundingReceivedEvent
  | actions.TransactionAction;

export function isDirectFundingAction(action: actions.WalletAction): action is FundingAction {
  return (
    action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' ||
    action.type === 'WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED' ||
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' ||
    actions.isTransactionAction(action)
  );
}
