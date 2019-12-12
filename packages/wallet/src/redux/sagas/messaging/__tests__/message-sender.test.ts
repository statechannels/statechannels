import {Wallet} from "ethers";
import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {strategyApproved} from "../../../../communication";
import {ETH_ASSET_HOLDER_ADDRESS} from "../../../../constants";
import * as stateHelpers from "../../../__tests__/state-helpers";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import {EMPTY_SHARED_DATA, setChannel, SharedData} from "../../../state";
import {messageSender} from "../message-sender";
import {
  addressResponse,
  channelProposedEvent,
  channelUpdatedEvent,
  createChannelResponse,
  noContractError,
  pushMessageResponse,
  relayActionWithMessage,
  sendChannelJoinedMessage,
  sendChannelProposedMessage,
  sendChannelUpdatedMessage,
  unknownChannelId,
  unknownSigningAddress,
  updateChannelResponse
} from "../outgoing-api-actions";

describe("message sender", () => {
  it("creates a notification for WALLET.CHANNEL_UPDATED_EVENT", async () => {
    const state = stateHelpers.appState({turnNum: 5});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );
    const channelId = stateHelpers.channelId;
    const message = channelUpdatedEvent({
      channelId
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "ChannelUpdated",
      params: {
        funding: [],
        turnNum: 5,
        status: "running",
        channelId
      }
    });
  });

  it("creates a notification for WALLET.SEND_CHANNEL_UPDATED_MESSAGE", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );
    const channelId = stateHelpers.channelId;
    const message = sendChannelUpdatedMessage({
      channelId,
      fromParticipantId: "A",
      toParticipantId: "B"
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "MessageQueued",
      params: {
        recipient: "B",
        sender: "A",
        data: {type: "Channel.Updated", signedState: state}
      }
    });
  });

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

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "MessageQueued",
      params: {
        recipient: "B",
        sender: "A",
        data: {type: "Channel.Open", signedState: state}
      }
    });
  });

  it("creates a notification for WALLET.SEND_CHANNEL_JOINED_MESSAGE", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );
    const channelId = stateHelpers.channelId;
    const message = sendChannelJoinedMessage({
      channelId,
      fromParticipantId: "A",
      toParticipantId: "B"
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "MessageQueued",
      params: {
        recipient: "B",
        sender: "A",
        data: {type: "Channel.Joined", signedState: state}
      }
    });
  });

  it("creates a notification for WALLET.RELAY_ACTION_WITH_MESSAGE", async () => {
    const state = stateHelpers.appState({turnNum: 0});

    const initialState = setChannel(
      EMPTY_SHARED_DATA,
      channelFromStates([state], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );

    const actionToRelay = strategyApproved({strategy: "VirtualFundingStrategy", processId: "id"});
    const message = relayActionWithMessage({
      actionToRelay,
      fromParticipantId: "A",
      toParticipantId: "B"
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "MessageQueued",
      params: {
        recipient: "B",
        sender: "A",
        data: actionToRelay
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

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "ChannelProposed",
      params: {
        funding: [],
        turnNum: 0,
        status: "proposed",
        channelId
      }
    });
  });

  it("sends a correct response message for WALLET.POST_MESSAGE", async () => {
    const message = pushMessageResponse({id: 5});
    const {effects} = await expectSaga(messageSender, message)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])

      .run();

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      id: 5,
      result: {success: true}
    });
  });

  it("sends a correct response message for WALLET.ADDRESS_RESPONSE", async () => {
    const address = Wallet.createRandom().address;
    const message = addressResponse({id: 5, address});
    const {effects} = await expectSaga(messageSender, message)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])

      .run();
    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      id: 5,
      result: address
    });
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

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        funding: [],
        turnNum: 0,
        status: "proposed",
        channelId
      }
    });
  });

  it("creates a correct response message for WALLET.UPDATE_CHANNEL_RESPONSE", async () => {
    const {state, signature} = stateHelpers.appState({turnNum: 1});
    const channelId = stateHelpers.channelId;
    const testSharedData: SharedData = {
      ...EMPTY_SHARED_DATA,
      assetHoldersState: {[ETH_ASSET_HOLDER_ADDRESS]: {[channelId]: {holdings: "0x5", channelId}}}
    };
    const initialState = setChannel(
      testSharedData,
      channelFromStates([{state, signature}], stateHelpers.asAddress, stateHelpers.asPrivateKey)
    );

    const message = updateChannelResponse({
      id: 1,
      channelId
    });

    const {effects} = await expectSaga(messageSender, message)
      .withState(initialState)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        funding: [{token: "0x0", amount: "0x5"}],
        turnNum: 1,
        status: "running",
        channelId
      }
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

    expect(effects.call[0].payload.args[0]).toMatchObject({
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

    expect(effects.call[0].payload.args[0]).toMatchObject({
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

    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: 1000,
        message: "The wallet can't find the channel corresponding to the channelId"
      }
    });
  });
});
