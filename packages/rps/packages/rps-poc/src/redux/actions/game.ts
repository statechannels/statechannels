import { ActionsUnion } from './type-helpers';

import Message from '../../game-engine/Message'

export enum GameActionType {
  CHOOSE_OPPONENT = 'GAME.CHOOSE_OPPONENT',
  CHOOSE_A_PLAY = 'GAME.CHOOSE_A_PLAY',
  MESSAGE_RECEIVED = 'GAME.MESSAGE_RECEIVED',
  EVENT_RECEIVED = 'GAME.EVENT_RECEIVED',
  MESSAGE_SENT = 'GAME.MESSAGE_SENT',
}

export const GameAction = {
  chooseOpponent: (opponentAddress: string, stake: number) => ({
    type: GameActionType.CHOOSE_OPPONENT as typeof GameActionType.CHOOSE_OPPONENT,
    opponentAddress,
    stake,
  }),

  chooseAPlay: (aPlay: string) => ({
    type: GameActionType.CHOOSE_A_PLAY as typeof GameActionType.CHOOSE_A_PLAY,
    aPlay,
  }),

  messageReceived: (message: Message) => ({
    type: GameActionType.MESSAGE_RECEIVED as typeof GameActionType.MESSAGE_RECEIVED,
    message,
  }),

  messageSent: (message: Message) => ({
    type: GameActionType.MESSAGE_SENT as typeof GameActionType.MESSAGE_SENT,
    message,
  }),

  eventReceived: (event: object) => ({
    type: GameActionType.EVENT_RECEIVED as typeof GameActionType.EVENT_RECEIVED,
    event,
  }),
};

export type GameAction = ActionsUnion<typeof GameAction>;
