import { NewLedgerChannelAction, isNewLedgerChannelAction } from '../new-ledger-channel/actions';
import {
  ExistingLedgerFundingAction,
  isExistingLedgerFundingAction,
} from '../existing-ledger-funding';
import { WalletAction } from '../../actions';
import { EmbeddedProtocol, routerFactory } from '../../../communication';

export type IndirectFundingAction = NewLedgerChannelAction | ExistingLedgerFundingAction;

export const isIndirectFundingAction = (action: WalletAction): action is IndirectFundingAction => {
  return isNewLedgerChannelAction(action) || isExistingLedgerFundingAction(action);
};

export const routesToIndirectFunding = routerFactory(
  isIndirectFundingAction,
  EmbeddedProtocol.IndirectFunding,
);
