import { WalletAction, CommitmentReceived, isCommonAction } from '../../../actions';
import { ActionConstructor } from '../../../utils';
import { KeepLedgerChannelApproved } from '../../../../communication';

// -------
// Actions
// -------
export interface Cancelled {
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED';
  processId: string;
}
export interface ConcludeApproved {
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED';
  processId: string;
}

export interface DefundChosen {
  type: 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN';
  processId: string;
}

export interface KeepOpenChosen {
  type: 'WALLET.CONCLUDING.INSTIGATOR.KEEP_OPEN_CHOSEN';
  processId: string;
}

export interface Acknowledged {
  type: 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED';
  processId: string;
}

// -------
// Constructors
// -------

export const cancelled: ActionConstructor<Cancelled> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED',
});

export const concludeApproved: ActionConstructor<ConcludeApproved> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED',
});

export const defundChosen: ActionConstructor<DefundChosen> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN',
});

export const keepOpenChosen: ActionConstructor<KeepOpenChosen> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.INSTIGATOR.KEEP_OPEN_CHOSEN',
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------

export type ConcludingInstigatorAction =
  | Cancelled
  | ConcludeApproved
  | DefundChosen
  | KeepOpenChosen
  | Acknowledged
  | CommitmentReceived
  | KeepLedgerChannelApproved;

export const isConcludingInstigatorAction = (
  action: WalletAction,
): action is ConcludingInstigatorAction => {
  return (
    isCommonAction(action) ||
    action.type === 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.KEEP_OPEN_CHOSEN' ||
    action.type === 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED'
  );
};
