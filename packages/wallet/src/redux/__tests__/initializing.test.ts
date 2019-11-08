import {walletReducer} from "../reducer";

import * as states from "../state";
import * as actions from "../actions";
import {itSendsThisJsonRpcResponse} from "./helpers";

describe("when in WaitForLogin", () => {
  const state = states.waitForLogin();

  describe("when a GetAddressRequest arrives", () => {
    const action = actions.addressRequest({domain: "test", id: 1});
    const result = walletReducer(state, action);

    it("transitions to WALLET_INITIALIZED", async () => {
      expect(result.type).toEqual(states.WALLET_INITIALIZED);
    });
    const address = (result as states.Initialized).address;

    itSendsThisJsonRpcResponse(result, actions.addressResponse({id: 1, address}));
  });
});
