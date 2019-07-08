import { WalletAction } from '../../actions';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from './reducer';
import { CommitmentsReceived } from '../../../communication';

export type ConsensusUpdateAction = CommitmentsReceived;

export const isConsensusUpdateAction = (action: WalletAction): action is ConsensusUpdateAction => {
  return (
    action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' &&
    action.protocolLocator.indexOf(CONSENSUS_UPDATE_PROTOCOL_LOCATOR) >= 0
  );
};
