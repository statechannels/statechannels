import { Commitment } from '../../../domain';
import { WalletAction } from '../../actions';
import { ActionConstructor } from '../../utils';

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

export type ApplicationAction = OpponentCommitmentReceived | OwnCommitmentReceived | Concluded;

export function isApplicationAction(action: WalletAction): action is ApplicationAction {
  return (
    action.type === 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.APPLICATION.CONCLUDED'
  );
}
