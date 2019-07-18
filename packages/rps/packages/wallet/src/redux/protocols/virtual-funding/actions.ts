import { WalletAction } from '../../actions';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import { EmbeddedProtocol, routerFactory } from '../../../communication';
import { ConsensusUpdateAction, isConsensusUpdateAction } from '../consensus-update';
import { isIndirectFundingAction, IndirectFundingAction } from '../indirect-funding';

export type VirtualFundingAction =
  | AdvanceChannelAction
  | IndirectFundingAction
  | ConsensusUpdateAction;

export function isVirtualFundingAction(action: WalletAction): action is VirtualFundingAction {
  return (
    isAdvanceChannelAction(action) ||
    isIndirectFundingAction(action) ||
    isConsensusUpdateAction(action)
  );
}

export const routesToVirtualFunding = routerFactory(
  isVirtualFundingAction,
  EmbeddedProtocol.VirtualFunding,
);
