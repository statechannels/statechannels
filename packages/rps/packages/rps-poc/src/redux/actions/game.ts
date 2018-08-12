import { ActionsUnion } from './type-helpers';

import { Play } from '../../game-engine/positions';
import Message from '../../game-engine/Message';
import { State } from '../../game-engine/application-states';

export enum GameActionType {
  CHOOSE_OPPONENT = 'GAME.CHOOSE_OPPONENT',
  CHOOSE_A_PLAY = 'GAME.CHOOSE_A_PLAY',
  MESSAGE_RECEIVED = 'GAME.MESSAGE_RECEIVED',
  EVENT_RECEIVED = 'GAME.EVENT_RECEIVED',
  MESSAGE_SENT = 'GAME.MESSAGE_SENT',
  STATE_CHANGED = 'GAME.STATE_CHANGED',
}

export const GameAction = {
  chooseOpponent: (opponent: string, stake: number) => ({
    type: GameActionType.CHOOSE_OPPONENT as typeof GameActionType.CHOOSE_OPPONENT,
    opponent,
    stake,
  }),

  chooseAPlay: (aPlay: Play) => ({
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

  stateChanged: (state: State)=> ({
    type: GameActionType.STATE_CHANGED as typeof GameActionType.STATE_CHANGED,
    state,
  }),
};

export type GameAction = ActionsUnion<typeof GameAction>;
