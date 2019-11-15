import {
  addressResponse,
  createChannelResponse,
  noContractError,
  unknownSigningAddress,
  sendChannelProposedMessage,
  postMessageResponse,
  channelProposedEvent,
  updateChannelResponse,
  unknownChannelId
} from "../../actions";
import {Wallet} from "ethers";
import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {messageSender} from "../message-sender";
import {channelFromStates} from "../../channel-store/channel-state/__tests__";
import * as stateHelpers from "../../__tests__/state-helpers";
import {setChannel, EMPTY_SHARED_DATA} from "../../state";

describe("message sender", () => {
  it("creates a notification for WALLET.SEND_CHANNEL_PROPOSED_MESSAGE", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );
    const channelId = stateHelpers.channelId;
    const message = sendChannelProposedMessage({
      channelId,
      fromParticipantId: "A",
      toParticipantId: "B"
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      method: "MessageQueued",
      params: {
        recipient: "A",
        sender: "B",
        data: {type: "Channel.Open", signedState: state}
      }
    });
  });
  it("creates a notification for WALLET.CHANNEL_PROPOSED_EVENT", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );
    const channelId = stateHelpers.channelId;
    const message = channelProposedEvent({
      channelId
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      method: "ChannelProposed",
      params: {
        funding: [],
        turnNum: 0,
        status: "Opening",
        channelId
      }
    });
  });
  it("sends a correct response message for WALLET.POST_MESSAGE", () => {
    const message = postMessageResponse({id: 5});
    return expectSaga(messageSender, message)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .call(
        window.parent.postMessage,
        JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          result: {success: true}
        }),
        "*"
      )
      .run();
  });

  it("sends a correct response message for WALLET.ADDRESS_RESPONSE", () => {
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

  it("creates a correct response message for WALLET.UPDATE_CHANNEL_RESPONSE", async () => {
    const {state, signature} = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([{state, signature}], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );

    const message = updateChannelResponse({
      id: 1,
      state
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {...state}
    });
  });

  it("creates a error response for WALLET.NO_CONTRACT_ERROR", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );

    const message = noContractError({
      id: 1,
      address: Wallet.createRandom().address
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {code: 1001, message: "Invalid app definition"}
    });
  });

  it("sends an error response for WALLET.UNKNOWN_SIGNING_ADDRESS", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );

    const message = unknownSigningAddress({
      id: 1,
      signingAddress: Wallet.createRandom().address
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {code: 1000, message: "Signing address not found in the participants array"}
    });
  });

  it("creates a error response for WALLET.UNKNOWN_CHANNEL_ID", async () => {
    const message = unknownChannelId({
      id: 1,
      channelId: "0xbadchannelid"
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(EMPTY_SHARED_DATA)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: 1000,
        message: "The wallet can't find the channel corresponding to the channelId"
      }
    });
  });
});
