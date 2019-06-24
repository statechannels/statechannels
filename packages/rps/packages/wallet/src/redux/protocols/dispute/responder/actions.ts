import { BaseProcessAction, DefundRequested } from '../../actions';
import { Commitment } from '../../../../domain';
import { TransactionAction } from '../../transaction-submission/actions';
import {
  isTransactionAction,
  ChallengeExpiredEvent,
  ChallengeExpirySetEvent,
  WalletAction,
} from '../../../actions';
import { ActionConstructor } from '../../../utils';

// -------
// Actions
// -------

export interface RespondApproved extends BaseProcessAction {
  type: 'WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED';
  processId: string;
}

export interface ResponseProvided extends BaseProcessAction {
  type: 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED';
  processId: string;
  commitment: Commitment;
}
export interface Acknowledged extends BaseProcessAction {
  type: 'WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED';
  processId: string;
}

// --------
// Constructors
// --------

export const respondApproved: ActionConstructor<RespondApproved> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED',
});

export const responseProvided: ActionConstructor<ResponseProvided> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED',
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------

export type ResponderAction =
  | TransactionAction
  | RespondApproved
  | ResponseProvided
  | ChallengeExpiredEvent
  | ChallengeExpirySetEvent
  | Acknowledged
  | DefundRequested;

export function isResponderAction(action: WalletAction): action is ResponderAction {
  return (
    isTransactionAction(action) ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED' ||
    action.type === 'WALLET.NEW_PROCESS.DEFUND_REQUESTED' // TODO in future this should be a new and distinct action that is not a new process Action
  );
}
