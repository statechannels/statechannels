import { WalletAction } from '../../actions';
import {
  CommitmentsReceived,
  BaseProcessAction,
  isCommonAction,
  ProtocolLocator,
  EmbeddedProtocol,
  routerFactory,
} from '../../../communication';
import { ActionConstructor } from '../../utils';

export interface ClearedToSend extends BaseProcessAction {
  type: 'WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND';
  protocolLocator: ProtocolLocator;
}

export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  return {
    ...p,
    type: 'WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND',
  };
};

export type ConsensusUpdateAction = CommitmentsReceived | ClearedToSend;

export const isConsensusUpdateAction = (action: WalletAction): action is ConsensusUpdateAction => {
  return (
    isCommonAction(action, EmbeddedProtocol.ConsensusUpdate) ||
    action.type === 'WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND'
  );
};

export const routesToConsensusUpdate = routerFactory(
  isConsensusUpdateAction,
  EmbeddedProtocol.ConsensusUpdate,
);
