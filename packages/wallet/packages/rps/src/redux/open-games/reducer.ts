import { Reducer } from "redux";

import * as actions from "./actions";
import { OpenGameState } from "./state";

const initialState = [];

export const openGamesReducer: Reducer<OpenGameState> = (state = initialState, action: actions.SyncOpenGames) => {
  switch (action.type) {
    case actions.SYNC_OPEN_GAMES:
      return action.openGames;
    default:
      // unreachable
      return state;
  }
};
