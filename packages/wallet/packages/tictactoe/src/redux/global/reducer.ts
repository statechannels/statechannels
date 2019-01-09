import { Reducer } from "redux";

import * as actions from "./actions";
import { RulesState } from "./state";

const initialState : RulesState = {
    visible: false,
};

export const rulesReducer: Reducer<RulesState> = (state = initialState, action: actions.ToggleVisibility) => {
  switch (action.type) {
    case actions.TOGGLE_VISIBILITY:
      return {visible: !state.visible};
    default:
      // unreachable
      return state;
  }
};
