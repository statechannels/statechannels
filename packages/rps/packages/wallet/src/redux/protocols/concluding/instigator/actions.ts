import { WalletAction, CommitmentReceived, COMMITMENT_RECEIVED } from '../../../actions';

export type ConcludingAction =
  | Cancelled
  | ConcludeApproved
  | CommitmentReceived
  | DefundChosen
  | Acknowledged
  | CommitmentReceived;
export interface Cancelled {
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED';
  processId: string;
}
// TODO: This should probably be called ApproveConclude.
export interface ConcludeApproved {
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED';
  processId: string;
}

export interface DefundChosen {
  type: 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN';
  processId: string;
}

export interface Acknowledged {
  type: 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED';
  processId: string;
}

// --------
// Creators
// --------

export const cancelled = (processId: string): Cancelled => ({
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED',
  processId,
});

export const concludeApproved = (processId: string): ConcludeApproved => ({
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED',
  processId,
});

export const defundChosen = (processId: string): DefundChosen => ({
  type: 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN',
  processId,
});

export const acknowledged = (processId: string): Acknowledged => ({
  type: 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED',
  processId,
});

// --------
// Helpers
// --------

export const isConcludingAction = (action: WalletAction): action is ConcludingAction => {
  if (action.type === COMMITMENT_RECEIVED) {
    return true;
  }
  return (
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED'
  );
};
