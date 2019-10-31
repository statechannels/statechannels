import {EngineAction} from "../../actions";
import {isConsensusUpdateAction, ConsensusUpdateAction} from "../consensus-update";
import {isDirectFundingAction, DirectFundingAction} from "../direct-funding/actions";
import {routerFactory, EmbeddedProtocol} from "../../../communication";

export type LedgerTopUpAction = ConsensusUpdateAction | DirectFundingAction;

export function isLedgerTopUpAction(action: EngineAction): action is LedgerTopUpAction {
  return isConsensusUpdateAction(action) || isDirectFundingAction(action);
}

export const routesToLedgerTopUp = routerFactory(isLedgerTopUpAction, EmbeddedProtocol.LedgerTopUp);
