import * as actions from '../game/actions';
import { Position } from '../../core';

export interface OutgoingMessage {
  opponentAddress: string;
  position: Position;
}

export interface MessageState {
  opponentOutbox?: OutgoingMessage;
  walletOutbox?: string;
  actionToRetry?: actions.PositionReceived;
}

export function sendMessage(position: Position, opponentAddress: string,  state: MessageState): MessageState {
  return { ...state, opponentOutbox: { opponentAddress, position }};
}
