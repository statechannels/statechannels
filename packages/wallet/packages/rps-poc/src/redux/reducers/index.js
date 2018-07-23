import { combineReducers } from 'redux';

import gameReducer from './game';
import opponentReducer from './opponents';

export default combineReducers({
  game: gameReducer,
  opponents: opponentReducer,
});
