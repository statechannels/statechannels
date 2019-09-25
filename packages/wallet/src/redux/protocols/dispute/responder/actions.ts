import { BaseProcessAction } from '../../actions';
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

export interface ExitChallenge {
  type: 'WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE';
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

export const responseProvided: ActionConstructor<ResponseProvided> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED',
});

export const exitChallenge: ActionConstructor<ExitChallenge> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE',
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
  | ExitChallenge;

export function isResponderAction(action: WalletAction): action is ResponderAction {
  return (
    isTransactionAction(action) ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED' ||
    action.type === 'WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED' ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE'
  );
}
