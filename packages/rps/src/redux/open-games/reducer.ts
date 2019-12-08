import {Reducer} from 'redux';

import * as actions from './actions';
import {OpenGameState} from './state';

const initialState = [];

export const openGamesReducer: Reducer<OpenGameState, actions.SyncOpenGames> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case actions.SYNC_OPEN_GAMES:
      const allGames = state.filter(game => game.name.match('Neo Bot')).concat(action.openGames);

      const gameMap = allGames.reduce((m, game) => {
        m[game.name] = game;
        return m;
      }, {});
      return Object.keys(gameMap).map(k => gameMap[k]);

    default:
      // unreachable
      return state;
  }
};
