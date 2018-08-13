import { Reducer } from 'redux';
import { GameActionType, GameAction } from '../actions/game';
import { State as ApplicationState } from '../../game-engine/application-states';

export type GameState = ApplicationState | null;
const initialState = null;

// todo: rewrite this to use the gameEngine and return actual data
export const gameReducer: Reducer<GameState> = (state=initialState, action: GameAction) => {
  switch (action.type) {
    case  GameActionType.STATE_CHANGED:
      return action.state;
    default:
      return state;
  }
}
