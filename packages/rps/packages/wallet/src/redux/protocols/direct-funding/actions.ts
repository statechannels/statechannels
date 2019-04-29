import * as actions from '../../actions';

export const DIRECT_FUNDING_REQUESTED = 'WALLET.INTERNAL.FUNDING.DIRECT_FUNDING_REQUESTED';
export const directFundingRequested = (
  processId,
  channelId: string,
  safeToDepositLevel: string,
  totalFundingRequired: string,
  requiredDeposit: string,
  ourIndex: number,
) => ({
  type: DIRECT_FUNDING_REQUESTED as typeof DIRECT_FUNDING_REQUESTED,
  processId,
  channelId,
  totalFundingRequired,
  safeToDepositLevel,
  requiredDeposit,
  ourIndex,
});
export type DirectFundingRequested = ReturnType<typeof directFundingRequested>;

export function isDirectFundingAction(action: actions.WalletAction): action is FundingAction {
  return action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' ||
    action.type === DIRECT_FUNDING_REQUESTED ||
    actions.isTransactionAction(action)
    ? true
    : false;
}

export type FundingAction =
  | DirectFundingRequested
  | actions.FundingReceivedEvent
  | actions.TransactionAction;
