import { WalletAction } from '../../actions';
import { IndirectFundingAction, isIndirectFundingAction } from '../indirect-funding/actions';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';

export type VirtualFundingAction = IndirectFundingAction | AdvanceChannelAction; // | ConsensusReachedAction

export function isVirtualFundingAction(action: WalletAction): action is VirtualFundingAction {
  return isIndirectFundingAction(action) || isAdvanceChannelAction(action);
}
