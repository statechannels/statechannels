import {WalletAction} from "../../actions";
import {AdvanceChannelAction, isAdvanceChannelAction} from "../advance-channel";
import {EmbeddedProtocol} from "../../../communication";
import {ConsensusUpdateAction, isConsensusUpdateAction} from "../consensus-update";
import {routerFactory} from "../../../communication/actions";

export type VirtualDefundingAction = AdvanceChannelAction | ConsensusUpdateAction;

export function isVirtualDefundingAction(action: WalletAction): action is VirtualDefundingAction {
  return isAdvanceChannelAction(action) || isConsensusUpdateAction(action);
}

export const routesToVirtualDefunding = routerFactory(
  isVirtualDefundingAction,
  EmbeddedProtocol.VirtualDefunding
);
