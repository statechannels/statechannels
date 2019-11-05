import {EngineAction} from "../../actions";
import {
  CommitmentsReceived,
  BaseProcessAction,
  isCommonAction,
  ProtocolLocator,
  EmbeddedProtocol,
  routerFactory
} from "../../../communication";
import {ActionConstructor} from "../../utils";

export interface ClearedToSend extends BaseProcessAction {
  type: "ENGINE.CONSENSUS_UPDATE.CLEARED_TO_SEND";
  protocolLocator: ProtocolLocator;
}

export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  return {
    ...p,
    type: "ENGINE.CONSENSUS_UPDATE.CLEARED_TO_SEND"
  };
};

export type ConsensusUpdateAction = CommitmentsReceived | ClearedToSend;

export const isConsensusUpdateAction = (action: EngineAction): action is ConsensusUpdateAction => {
  return (
    isCommonAction(action, EmbeddedProtocol.ConsensusUpdate) ||
    action.type === "ENGINE.CONSENSUS_UPDATE.CLEARED_TO_SEND"
  );
};

export const routesToConsensusUpdate = routerFactory(isConsensusUpdateAction, EmbeddedProtocol.ConsensusUpdate);
