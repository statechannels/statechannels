import * as actions from '../game/actions';
import { Commitment, Address } from 'fmg-core';
import { RPSCommitment, asCoreCommitment } from '../../core/rps-commitment';

export interface OutgoingMessage {
  opponentAddress: Address;
  commitment: Commitment;
}
export interface WalletRequest {
  type:
    | 'FUNDING_REQUESTED'
    | 'RESPOND_TO_CHALLENGE'
    | 'WITHDRAWAL_REQUESTED'
    | 'CONCLUDE_REQUESTED'
    | 'CHALLENGE_REQUESTED';
  data?: any;
}
export interface MessageState {
  opponentOutbox?: OutgoingMessage;
  walletOutbox?: WalletRequest;
  actionToRetry?: actions.CommitmentReceived;
}

export function sendMessage(
  commitment: RPSCommitment,
  opponentAddress: string,
  state: MessageState
): MessageState {
  return {
    ...state,
    opponentOutbox: { opponentAddress, commitment: asCoreCommitment(commitment) },
  };
}
