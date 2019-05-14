import { CommitmentReceived, WalletAction } from '../../../actions';

export interface ConcludeApproved {
  type: 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED';
  processId: string;
}

export interface DefundChosen {
  type: 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN';
  processId: string;
}

export interface Acknowledged {
  type: 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED';
  processId: string;
}

// --------
// Creators
// --------

export const concludeApproved = (processId: string): ConcludeApproved => ({
  type: 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED',
  processId,
});

export const defundChosen = (processId: string): DefundChosen => ({
  type: 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN',
  processId,
});

export const acknowledged = (processId: string): Acknowledged => ({
  type: 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED',
  processId,
});

// --------
// Helpers
// --------

export const isConcludingAction = (action: WalletAction): action is ConcludingAction => {
  return (
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED'
  );
};

export type ConcludingAction = CommitmentReceived | ConcludeApproved | DefundChosen | Acknowledged;
