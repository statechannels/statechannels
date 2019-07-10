import { WalletAction } from '../../actions';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import { isIndirectFundingAction, IndirectFundingAction } from '../indirect-funding';

export type VirtualFundingAction = IndirectFundingAction | AdvanceChannelAction; // | ConsensusReachedAction

export function isVirtualFundingAction(action: WalletAction): action is VirtualFundingAction {
  return isIndirectFundingAction(action) || isAdvanceChannelAction(action);
}
