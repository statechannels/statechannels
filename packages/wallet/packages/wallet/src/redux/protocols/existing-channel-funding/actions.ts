import { CommitmentReceived, WalletAction } from '../../actions';
import { LedgerTopUpAction, isLedgerTopUpAction } from '../ledger-top-up/actions';
import { EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR } from './reducer';

export type ExistingChannelFundingAction = CommitmentReceived | LedgerTopUpAction;

export function isExistingChannelFundingAction(
  action: WalletAction,
): action is ExistingChannelFundingAction {
  return (
    (action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' &&
      action.protocolLocator === EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR) ||
    isLedgerTopUpAction(action)
  );
}
