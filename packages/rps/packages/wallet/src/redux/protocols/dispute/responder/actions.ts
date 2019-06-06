import { BaseProcessAction } from '../../actions';
import { Commitment } from '../../../../domain';
import { TransactionAction } from '../../transaction-submission/actions';
import {
  isTransactionAction,
  ChallengeExpiredEvent,
  ChallengeExpirySetEvent,
  WalletAction,
} from '../../../actions';
import { isDefundingAction, DefundingAction } from '../../defunding/actions';
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

export interface RespondSuccessAcknowledged extends BaseProcessAction {
  type: 'WALLET.DISPUTE.RESPONDER.RESPOND_SUCCESS_ACKNOWLEDGED';
  processId: string;
}

export interface DefundChosen extends BaseProcessAction {
  type: 'WALLET.DISPUTE.RESPONDER.DEFUND_CHOSEN';
  processId: string;
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

export const respondSuccessAcknowledged: ActionConstructor<RespondSuccessAcknowledged> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.RESPOND_SUCCESS_ACKNOWLEDGED',
});

export const responseProvided: ActionConstructor<ResponseProvided> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED',
});

export const defundChosen: ActionConstructor<DefundChosen> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.DEFUND_CHOSEN',
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
  | DefundingAction
  | RespondApproved
  | ResponseProvided
  | RespondSuccessAcknowledged
  | ChallengeExpiredEvent
  | ChallengeExpirySetEvent
  | DefundChosen
  | Acknowledged;

export function isResponderAction(action: WalletAction): action is ResponderAction {
  return (
    isTransactionAction(action) ||
    isDefundingAction(action) ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPOND_SUCCESS_ACKNOWLEDGED' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.DEFUND_CHOSEN' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED'
  );
}
