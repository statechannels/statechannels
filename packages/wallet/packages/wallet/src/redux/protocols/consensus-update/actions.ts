import { WalletAction } from '../../actions';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from './reducer';
import { CommitmentsReceived, BaseProcessAction } from '../../../communication';
import { ActionConstructor } from '../../utils';

export interface ClearedToSend extends BaseProcessAction {
  type: 'WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND';
  protocolLocator: string;
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
    (action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' &&
      action.protocolLocator.indexOf(CONSENSUS_UPDATE_PROTOCOL_LOCATOR) >= 0) ||
    action.type === 'WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND'
  );
};
