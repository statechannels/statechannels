import {messageHandler} from "../message-handler";
import * as walletStates from "../../state";

import {addressResponse} from "../../actions";
import {expectSaga} from "redux-saga-test-plan";
import {Wallet} from "ethers";

import {messageSender} from "../message-sender";
import {fork} from "redux-saga/effects";
describe("message listener", () => {
  const wallet = Wallet.createRandom();
  const initialState = walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,

    processStore: {},
    channelSubscriptions: {},
    privateKey: wallet.privateKey,
    address: wallet.address
  });

  it("handles an address request", () => {
    const requestMessage = JSON.stringify({
      jsonrpc: "2.0",
      method: "GetAddress",
      id: 1,
      params: {}
    });

    return (
      expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([[fork(messageSender, addressResponse({id: 1, address: wallet.address})), 0]])
        .fork(messageSender, addressResponse({id: 1, address: wallet.address}))
        .run()
    );
  });
});
