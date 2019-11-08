import {messageHandler} from "../message-handler";
import * as walletStates from "../../state";
import SagaTester from "redux-saga-tester";
import {addressRequest} from "../../actions";
describe("message listener", () => {
  const initialState = walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,

    processStore: {},
    channelSubscriptions: {},
    privateKey: "",
    address: ""
  });

  it("handles an address request", async () => {
    const requestMessage = JSON.stringify({
      jsonrpc: "2.0",
      method: "GetAddress",
      id: 1,
      params: {}
    });
    const domain = "localhost";

    const sagaTester = new SagaTester({initialState});
    sagaTester.start(messageHandler, requestMessage, domain);

    await sagaTester.waitFor("WALLET.ADDRESS_REQUEST");

    const actions = sagaTester.getCalledActions();
    expect(actions).toContainEqual(addressRequest({domain, id: 1}));
  });
});
