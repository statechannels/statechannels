import * as actions from '../game/actions';
import { RPSCommitment } from '../../core/rps-commitment';


export interface OutgoingMessage {
  opponentAddress: string;
  commitment: RPSCommitment;
}
export interface WalletMessage {
  type: "FUNDING_REQUESTED" | "RESPOND_TO_CHALLENGE" | "WITHDRAWAL_REQUESTED" | "CONCLUDE_REQUESTED" | 'CHALLENGE_REQUESTED';
  data?: any;
}
export interface MessageState {
  opponentOutbox?: OutgoingMessage;
  walletOutbox?: WalletMessage;
  actionToRetry?: actions.CommitmentReceived;
}

export function sendMessage(commitment: RPSCommitment, opponentAddress: string, state: MessageState): MessageState {
  return { ...state, opponentOutbox: { opponentAddress, commitment } };
}
