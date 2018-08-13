import { ActionsUnion } from './type-helpers';

import { Play } from '../../game-engine/positions';
import Move from '../../game-engine/Move';
import { State } from '../../game-engine/application-states';

export enum GameActionType {
  CHOOSE_OPPONENT = 'GAME.CHOOSE_OPPONENT',
  CHOOSE_A_PLAY = 'GAME.CHOOSE_A_PLAY',
  EVENT_RECEIVED = 'GAME.EVENT_RECEIVED',
  MOVE_RECEIVED = 'GAME.MOVE_RECEIVED',
  MOVE_SENT = 'GAME.MOVE_SENT',
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

  moveReceived: (move: Move) => ({
    type: GameActionType.MOVE_RECEIVED as typeof GameActionType.MOVE_RECEIVED,
    move,
  }),

  moveSent: (move: Move) => ({
    type: GameActionType.MOVE_SENT as typeof GameActionType.MOVE_SENT,
    move,
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
