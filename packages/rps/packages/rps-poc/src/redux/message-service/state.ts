import * as actions from '../game/actions';
import { Position } from '../../core';

export interface OutgoingMessage {
  opponentAddress: string;
  position: Position;
}
export interface WalletMessage {
  type: "FUNDING_REQUESTED" | "RESPOND_TO_CHALLENGE" | "WITHDRAWAL_REQUESTED" | "CONCLUDE_REQUESTED";
  data?: any;
}
export interface MessageState {
  opponentOutbox?: OutgoingMessage;
  walletOutbox?: WalletMessage;
  actionToRetry?: actions.PositionReceived;
}

export function sendMessage(position: Position, opponentAddress: string, state: MessageState): MessageState {
  return { ...state, opponentOutbox: { opponentAddress, position } };
}
