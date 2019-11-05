import {engineReducer} from "../reducer";

import * as states from "../state";
import * as actions from "../actions";

describe("when in WaitForLogin", () => {
  const state = states.waitForLogin();

  describe("when the player logs in", () => {
    const action = actions.loggedIn({uid: "uid"});
    const updatedState = engineReducer(state, action);

    it("transitions to ENGINE_INITIALIZED", async () => {
      expect(updatedState.type).toEqual(states.ENGINE_INITIALIZED);
    });
  });
});
