import { Commitment } from '../../../domain';
import { WalletAction } from '../../actions';
import { ActionConstructor } from '../../utils';
import { DisputeAction, isDisputeAction } from '../dispute';

// -------
// Actions
// -------
export interface OwnCommitmentReceived {
  type: 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED';
  processId: string;
  commitment: Commitment;
}

export interface OpponentCommitmentReceived {
  type: 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED';
  processId: string;
  commitment: Commitment;
  signature: string;
}

export interface ChallengeRequested {
  type: 'WALLET.APPLICATION.CHALLENGE_REQUESTED';
  commitment: Commitment;
  processId: string;
  channelId: string;
}

export interface ChallengeDetected {
  type: 'WALLET.APPLICATION.CHALLENGE_DETECTED';
  processId: string;
  channelId: string;
  expiresAt: number;
  commitment: Commitment;
}
export interface Concluded {
  type: 'WALLET.APPLICATION.CONCLUDED';
  processId: string;
}

// -------
// Constructors
// -------

export const ownCommitmentReceived: ActionConstructor<OwnCommitmentReceived> = p => {
  const { processId, commitment } = p;
  return {
    type: 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED',
    processId,
    commitment,
  };
};

export const opponentCommitmentReceived: ActionConstructor<OpponentCommitmentReceived> = p => {
  const { processId, commitment, signature } = p;
  return {
    type: 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED',
    processId,
    commitment,
    signature,
  };
};

export const challengeRequested: ActionConstructor<ChallengeRequested> = p => ({
  ...p,
  type: 'WALLET.APPLICATION.CHALLENGE_REQUESTED',
});

export const challengeDetected: ActionConstructor<ChallengeDetected> = p => ({
  ...p,
  type: 'WALLET.APPLICATION.CHALLENGE_DETECTED',
});

export const concluded: ActionConstructor<Concluded> = p => {
  const { processId } = p;
  return {
    type: 'WALLET.APPLICATION.CONCLUDED',
    processId,
  };
};

// -------
// Unions and Guards
// -------

export type ApplicationAction =
  | OpponentCommitmentReceived
  | OwnCommitmentReceived
  | ChallengeDetected
  | ChallengeRequested
  | Concluded
  | DisputeAction;

export function isApplicationAction(action: WalletAction): action is ApplicationAction {
  return (
    isDisputeAction(action) ||
    action.type === 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.APPLICATION.CHALLENGE_DETECTED' ||
    action.type === 'WALLET.APPLICATION.CHALLENGE_REQUESTED' ||
    action.type === 'WALLET.APPLICATION.CONCLUDED'
  );
}
