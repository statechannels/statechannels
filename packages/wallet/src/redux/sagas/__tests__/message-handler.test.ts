import {messageHandler} from "../message-handler";
import * as walletStates from "../../state";

import {addressResponse} from "../../actions";
import {expectSaga} from "redux-saga-test-plan";
import {Wallet} from "ethers";

import {messageSender} from "../message-sender";
describe("message listener", () => {
  const wallet = Wallet.createRandom();
  const initialState = walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,

    processStore: {},
    channelSubscriptions: {},
    privateKey: wallet.privateKey,
    address: wallet.address
  });

  it("handles an address request", async () => {
    const requestMessage = JSON.stringify({
      jsonrpc: "2.0",
      method: "GetAddress",
      id: 1,
      params: {}
    });

    expectSaga(messageHandler, requestMessage, "localhost")
      .withState(initialState)
      .fork(messageSender, addressResponse({id: 1, address: wallet.address}));
  });
});
