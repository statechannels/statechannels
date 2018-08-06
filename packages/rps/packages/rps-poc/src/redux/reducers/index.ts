import { combineReducers } from 'redux';

import game from './game';
import opponents from './opponents';
import login from './login';
import messages from './messages';

export default combineReducers({
  game,
  opponents,
  login,
  messages,
});
