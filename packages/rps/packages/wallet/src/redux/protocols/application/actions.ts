import { Commitment } from '../../../domain';
import { ProtocolAction } from '../../actions';

export const OWN_COMMITMENT_RECEIVED = 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED';
export const ownCommitmentReceived = (processId: string, commitment: Commitment) => ({
  type: OWN_COMMITMENT_RECEIVED as typeof OWN_COMMITMENT_RECEIVED,
  processId,
  commitment,
});
export type OwnCommitmentReceived = ReturnType<typeof ownCommitmentReceived>;

export const OPPONENT_COMMITMENT_RECEIVED = 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED';
export const opponentCommitmentReceived = (
  processId: string,
  commitment: Commitment,
  signature: string,
) => ({
  type: OPPONENT_COMMITMENT_RECEIVED as typeof OPPONENT_COMMITMENT_RECEIVED,
  processId,
  commitment,
  signature,
});
export type OpponentCommitmentReceived = ReturnType<typeof opponentCommitmentReceived>;

export const CLOSE_REQUESTED = 'CLOSE_REQUESTED';
export const closeRequested = (processId: string) => ({
  type: CLOSE_REQUESTED as typeof CLOSE_REQUESTED,
  processId,
});
export type CloseRequested = ReturnType<typeof closeRequested>;

export type ApplicationAction = OpponentCommitmentReceived | OwnCommitmentReceived | CloseRequested;

export function isApplicationAction(action: ProtocolAction): action is ApplicationAction {
  return (
    action.type === OPPONENT_COMMITMENT_RECEIVED ||
    action.type === OWN_COMMITMENT_RECEIVED ||
    action.type === CLOSE_REQUESTED
  );
}
