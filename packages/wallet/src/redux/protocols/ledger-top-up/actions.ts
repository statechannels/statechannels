import {WalletAction} from "../../actions";
import {DirectFundingAction} from "../direct-funding";
import {isDirectFundingAction} from "../direct-funding/actions";
import {EmbeddedProtocol, routerFactory} from "../../../communication";
import {ConsensusUpdateAction, isConsensusUpdateAction} from "../consensus-update";

export type LedgerTopUpAction = ConsensusUpdateAction | DirectFundingAction;

export function isLedgerTopUpAction(action: WalletAction): action is LedgerTopUpAction {
  return isConsensusUpdateAction(action) || isDirectFundingAction(action);
}

export const routesToLedgerTopUp = routerFactory(isLedgerTopUpAction, EmbeddedProtocol.LedgerTopUp);
