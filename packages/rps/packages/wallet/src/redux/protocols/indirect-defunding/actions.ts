import { CommitmentReceived, COMMITMENT_RECEIVED, WalletAction } from '../../actions';

export type IndirectDefundingAction = CommitmentReceived;

export function isIndirectDefundingAction(action: WalletAction): action is IndirectDefundingAction {
  return action.type === COMMITMENT_RECEIVED;
}
