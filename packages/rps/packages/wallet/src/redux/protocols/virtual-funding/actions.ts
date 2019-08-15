import { WalletAction } from '../../actions';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import { EmbeddedProtocol, routerFactory } from '../../../communication';
import { ConsensusUpdateAction, isConsensusUpdateAction } from '../consensus-update';
import { isLedgerFundingAction, LedgerFundingAction } from '../ledger-funding';

export type VirtualFundingAction =
  | AdvanceChannelAction
  | LedgerFundingAction
  | ConsensusUpdateAction;

export function isVirtualFundingAction(action: WalletAction): action is VirtualFundingAction {
  return (
    isAdvanceChannelAction(action) ||
    isLedgerFundingAction(action) ||
    isConsensusUpdateAction(action)
  );
}

export const routesToVirtualFunding = routerFactory(
  isVirtualFundingAction,
  EmbeddedProtocol.VirtualFunding,
);
