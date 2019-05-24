import { CommitmentReceived, WalletAction } from '../../../actions';
import { ActionConstructor } from '../../../utils';

// -------
// Actions
// -------
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

// -------
// Constructors
// -------

export const concludeApproved: ActionConstructor<ConcludeApproved> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED',
});

export const defundChosen: ActionConstructor<DefundChosen> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN',
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------

export type ConcludingAction = CommitmentReceived | ConcludeApproved | DefundChosen | Acknowledged;

export const isConcludingAction = (action: WalletAction): action is ConcludingAction => {
  return (
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED'
  );
};
