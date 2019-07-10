import * as actions from '../../actions';
import { ActionConstructor } from '../../utils';
import { TwoPartyPlayerIndex } from '../../types';
import { DIRECT_FUNDING_PROTOCOL_LOCATOR } from './reducer';

// -------
// Actions
// -------
export interface DirectFundingRequested {
  type: 'WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED';
  processId: string;
  channelId: string;
  totalFundingRequired: string;
  safeToDepositLevel: string;
  requiredDeposit: string;
  ourIndex: TwoPartyPlayerIndex;
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

export type DirectFundingAction =
  | DirectFundingRequested
  | actions.CommitmentReceived
  | actions.FundingReceivedEvent
  | actions.advanceChannel.AdvanceChannelAction
  | actions.TransactionAction;

export function isDirectFundingAction(action: actions.WalletAction): action is DirectFundingAction {
  return (
    action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' ||
    action.type === 'WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED' ||
    (action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' &&
      action.protocolLocator === DIRECT_FUNDING_PROTOCOL_LOCATOR) ||
    actions.advanceChannel.isAdvanceChannelAction(action) ||
    actions.isTransactionAction(action)
  );
}
