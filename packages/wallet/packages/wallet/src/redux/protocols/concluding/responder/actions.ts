import { WalletAction } from '../../../actions';
import { ActionConstructor } from '../../../utils';
import { isCommonAction } from '../../../../communication';

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

export interface KeepOpenChosen {
  type: 'WALLET.CONCLUDING.RESPONDER.KEEP_OPEN_CHOSEN';
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

export const keepOpenChosen: ActionConstructor<KeepOpenChosen> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.RESPONDER.KEEP_OPEN_CHOSEN',
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------

export type ConcludingResponderAction =
  | ConcludeApproved
  | DefundChosen
  | KeepOpenChosen
  | Acknowledged;

export const isConcludingResponderAction = (
  action: WalletAction,
): action is ConcludingResponderAction => {
  return (
    isCommonAction(action) ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.KEEP_OPEN_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED'
  );
};
