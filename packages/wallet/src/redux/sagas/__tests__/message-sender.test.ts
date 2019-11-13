import {addressResponse, createChannelResponse} from "../../actions";
import {Wallet} from "ethers";
import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {messageSender} from "../message-sender";
import {channelFromStates} from "../../channel-store/channel-state/__tests__";
import * as stateHelpers from "../../__tests__/state-helpers";
import {setChannel, EMPTY_SHARED_DATA} from "../../state";

describe("create message", () => {
  it("creates a correct response message for WALLET.ADDRESS_RESPONSE", () => {
    const address = Wallet.createRandom().address;
    const message = addressResponse({id: 5, address});
    return expectSaga(messageSender, message)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .call(
        window.parent.postMessage,
        JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          result: address
        }),
        "*"
      )
      .run();
  });
  it("creates a correct response message for WALLET.CREATE_CHANNEL_RESPONSE", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );
    const channelId = stateHelpers.channelId;
    const message = createChannelResponse({
      id: 1,
      channelId
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        funding: [],
        turnNum: 0,
        status: "Opening",
        channelId
      }
    });
  });
});
