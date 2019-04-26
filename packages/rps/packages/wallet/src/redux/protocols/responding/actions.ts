import { BaseProcessAction } from '../actions';
import { Commitment } from '../../../domain';
import { TransactionAction } from '../transaction-submission/actions';

export type RespondingAction =
  | RespondApproved
  | RespondRejected
  | ResponseProvided
  | RespondSuccessAcknowledged
  | TransactionAction;

export const RESPOND_APPROVED = 'WALLET.RESPOND_APPROVED';
export const RESPOND_REJECTED = 'WALLET.RESPOND_REJECTED';
export const RESPONSE_PROVIDED = 'WALLET.RESPONSE_PROVIDED';
export const RESPOND_SUCCESS_ACKNOWLEDGED = 'WALLET.RESPOND_SUCCESS_ACKNOWLEDGED';

export interface RespondApproved extends BaseProcessAction {
  type: typeof RESPOND_APPROVED;
  processId: string;
}

export interface RespondRejected extends BaseProcessAction {
  type: typeof RESPOND_REJECTED;
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

// --------
// Creators
// --------

export const respondApproved = (processId: string): RespondApproved => ({
  type: RESPOND_APPROVED,
  processId,
});

export const respondRejected = (processId: string): RespondRejected => ({
  type: RESPOND_REJECTED,
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
