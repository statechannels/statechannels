import { WalletAction } from '../../actions';
import { NewLedgerFundingAction, isNewLedgerFundingAction } from '../new-ledger-funding/actions';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';

export type VirtualFundingAction = NewLedgerFundingAction | AdvanceChannelAction; // | ConsensusReachedAction

export function isVirtualFundingAction(action: WalletAction): action is VirtualFundingAction {
  return isNewLedgerFundingAction(action) || isAdvanceChannelAction(action);
}
