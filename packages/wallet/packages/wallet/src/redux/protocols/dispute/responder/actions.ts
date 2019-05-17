import { BaseProcessAction } from '../../actions';
import { Commitment } from '../../../../domain';
import { TransactionAction } from '../../transaction-submission/actions';
import {
  ProtocolAction,
  isTransactionAction,
  ChallengeExpiredEvent,
  ChallengeExpirySetEvent,
  CHALLENGE_EXPIRY_SET_EVENT,
  CHALLENGE_EXPIRED_EVENT,
} from '../../../actions';
import { isDefundingAction } from '../../defunding/actions';

export type ResponderAction =
  | RespondApproved
  | ResponseProvided
  | RespondSuccessAcknowledged
  | TransactionAction
  | ChallengeExpiredEvent
  | ChallengeExpirySetEvent
  | DefundChosen
  | Acknowledged;

export const RESPOND_APPROVED = 'WALLET.RESPOND_APPROVED';
export const RESPONSE_PROVIDED = 'WALLET.RESPONSE_PROVIDED';
export const RESPOND_SUCCESS_ACKNOWLEDGED = 'WALLET.RESPOND_SUCCESS_ACKNOWLEDGED';
export const DEFUND_CHOSEN = 'WALLET.RESPOND.DEFUND_CHOSEN';
export const ACKNOWLEDGED = 'WALLET.RESPOND.ACKNOWLEDGED';

export interface RespondApproved extends BaseProcessAction {
  type: typeof RESPOND_APPROVED;
  processId: string;
}

export interface ResponseProvided extends BaseProcessAction {
  type: typeof RESPONSE_PROVIDED;
  processId: string;
  commitment: Commitment;
}

export interface RespondSuccessAcknowledged extends BaseProcessAction {
  type: typeof RESPOND_SUCCESS_ACKNOWLEDGED;
  processId: string;
}

export interface DefundChosen extends BaseProcessAction {
  type: typeof DEFUND_CHOSEN;
  processId: string;
}
export interface Acknowledged extends BaseProcessAction {
  type: typeof ACKNOWLEDGED;
  processId: string;
}

// --------
// Creators
// --------

export const respondApproved = (processId: string): RespondApproved => ({
  type: RESPOND_APPROVED,
  processId,
});

export const respondSuccessAcknowledged = (processId: string): RespondSuccessAcknowledged => ({
  type: RESPOND_SUCCESS_ACKNOWLEDGED,
  processId,
});

export const responseProvided = (processId: string, commitment: Commitment): ResponseProvided => ({
  type: RESPONSE_PROVIDED,
  processId,
  commitment,
});

export const defundChosen = (processId: string): DefundChosen => ({
  type: DEFUND_CHOSEN,
  processId,
});

export const acknowledged = (processId: string): Acknowledged => ({
  type: ACKNOWLEDGED,
  processId,
});

export function isResponderAction(action: ProtocolAction): action is ResponderAction {
  return (
    isTransactionAction(action) ||
    isDefundingAction(action) ||
    action.type === RESPOND_APPROVED ||
    action.type === RESPONSE_PROVIDED ||
    action.type === RESPOND_SUCCESS_ACKNOWLEDGED ||
    action.type === CHALLENGE_EXPIRY_SET_EVENT ||
    action.type === CHALLENGE_EXPIRED_EVENT ||
    action.type === DEFUND_CHOSEN ||
    action.type === ACKNOWLEDGED
  );
}
