import { CommitmentReceived, WalletAction } from '../../actions';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from './reducer';

export type ConsensusUpdateAction = CommitmentReceived;

export const isConsensusUpdateAction = (action: WalletAction): action is ConsensusUpdateAction => {
  return (
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' &&
    action.protocolLocator === CONSENSUS_UPDATE_PROTOCOL_LOCATOR
  );
};
