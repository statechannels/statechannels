import {WalletAction} from "../../actions";
import {LedgerTopUpAction, isLedgerTopUpAction} from "../ledger-top-up/actions";
import {EmbeddedProtocol, routerFactory} from "../../../communication";
import {isConsensusUpdateAction, ConsensusUpdateAction} from "../consensus-update";

export type ExistingLedgerFundingAction = ConsensusUpdateAction | LedgerTopUpAction;

export function isExistingLedgerFundingAction(action: WalletAction): action is ExistingLedgerFundingAction {
  return isConsensusUpdateAction(action) || isLedgerTopUpAction(action);
}

export const routestoExistingLedgerFunding = routerFactory(
  isExistingLedgerFundingAction,
  EmbeddedProtocol.ExistingLedgerFunding
);
