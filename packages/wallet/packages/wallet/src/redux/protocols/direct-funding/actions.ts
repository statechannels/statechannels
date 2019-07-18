import * as actions from '../../actions';
import { ActionConstructor } from '../../utils';
import { TwoPartyPlayerIndex } from '../../types';
import { isCommonAction, EmbeddedProtocol, routerFactory } from '../../../communication';

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

type EmbeddedAction = actions.advanceChannel.AdvanceChannelAction | actions.TransactionAction;

export type DirectFundingAction =
  | DirectFundingRequested
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
    action.type === 'WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED' ||
    isCommonAction(action, EmbeddedProtocol.DirectFunding) ||
    isEmbeddedAction(action)
  );
}

export const routesToDirectFunding = routerFactory(
  isDirectFundingAction,
  EmbeddedProtocol.DirectFunding,
);
