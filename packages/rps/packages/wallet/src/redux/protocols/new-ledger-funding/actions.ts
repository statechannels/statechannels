import { isDirectFundingAction, DirectFundingAction } from '../direct-funding/actions';
import { ConsensusUpdateAction, isConsensusUpdateAction } from '../consensus-update';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import { WalletAction } from '../../actions';

// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------

export type NewLedgerFundingAction =
  | ConsensusUpdateAction
  | AdvanceChannelAction
  | DirectFundingAction;
export function isNewLedgerFundingAction(action: WalletAction): action is NewLedgerFundingAction {
  return (
    isDirectFundingAction(action) ||
    isConsensusUpdateAction(action) ||
    isAdvanceChannelAction(action)
  );
}
