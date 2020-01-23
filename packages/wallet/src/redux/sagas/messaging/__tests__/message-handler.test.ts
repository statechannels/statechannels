import {convertAddressToBytes32} from "@statechannels/nitro-protocol";
import {messageHandler} from "../message-handler";
import * as walletStates from "../../../state";
import {addressResponse} from "../outgoing-api-actions";
import {expectSaga} from "redux-saga-test-plan";
import {Wallet} from "ethers";
import {messageSender} from "../message-sender";
import * as matchers from "redux-saga-test-plan/matchers";
import {getAddress} from "../../../selectors";
import {asAddress, bsAddress, appState, asPrivateKey} from "../../../__tests__/state-helpers";
import {getProvider} from "../../../../utils/contract-utils";
import {setChannel} from "../../../channel-store";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import * as stateHelpers from "../../../__tests__/state-helpers";
import {AddressZero} from "ethers/constants";
import {strategyApproved} from "../../../../communication";

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
    const requestMessage = {
      jsonrpc: "2.0",
      method: "GetAddress",
      id: 1,
      params: {}
    };

    return (
      expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .fork(messageSender, addressResponse({id: 1, address: wallet.address}))
        .run()
    );
  });

  describe("PushMessage", () => {
    it("handles a pushMessage with a channel open message", async () => {
      const signedState = appState({turnNum: 0});
      const destinationA = Wallet.createRandom().address;
      const signingAddressA = asAddress;
      const signingAddressB = bsAddress;
      const destinationB = Wallet.createRandom().address;
      const participants = [
        {
          participantId: "user-a",
          signingAddress: signingAddressA,
          destination: destinationA
        },
        {
          participantId: "user-b",
          signingAddress: signingAddressB,
          destination: destinationB
        }
      ];
      const pushMessage = {
        jsonrpc: "2.0",
        method: "PushMessage",
        id: 1,
        params: {
          recipient: "user-a",
          sender: "user-b",
          data: {type: "Channel.Open", participants, signedState}
        }
      };

      const {effects} = await expectSaga(messageHandler, pushMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), asAddress],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x12345";
              }
            }
          ]
        ])
        .run();

      expect(effects.put[1].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.OPPONENT_STATE_RECEIVED",
        signedState
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.PUSH_MESSAGE_RESPONSE",
        id: 1
      });

      expect(effects.fork[1].payload.args[0]).toMatchObject({
        type: "WALLET.CHANNEL_PROPOSED_EVENT",
        channelId: expect.any(String)
      });
    });

    it("handles a pushMessage with a channel joined message", async () => {
      const signedState = appState({turnNum: 0});

      const pushMessage = {
        jsonrpc: "2.0",
        method: "PushMessage",
        id: 1,
        params: {
          recipient: "user-a",
          sender: "user-b",
          data: {type: "Channel.Joined", signedState}
        }
      };

      const {effects} = await expectSaga(messageHandler, pushMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), asAddress],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x12345";
              }
            }
          ]
        ])
        .run();

      expect(effects.put[0].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.OPPONENT_STATE_RECEIVED",
        signedState
      });
    });

    it("handles a pushMessage with a channel updated message", async () => {
      const signedState = appState({turnNum: 5});

      const pushMessage = {
        jsonrpc: "2.0",
        method: "PushMessage",
        id: 1,
        params: {
          recipient: "user-a",
          sender: "user-b",
          data: {type: "Channel.Updated", signedState}
        }
      };

      const {effects} = await expectSaga(messageHandler, pushMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), asAddress],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x12345";
              }
            }
          ]
        ])
        .run();

      expect(effects.put[0].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.OPPONENT_STATE_RECEIVED",
        signedState
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.PUSH_MESSAGE_RESPONSE",
        id: 1
      });

      expect(effects.fork[1].payload.args[0]).toMatchObject({
        type: "WALLET.CHANNEL_UPDATED_EVENT",
        channelId: expect.any(String)
      });
    });

    it("handles a pushMessage with a relay action message", async () => {
      const actionToRelay = strategyApproved({
        strategy: "IndirectFundingStrategy",
        processId: "id"
      });
      const pushMessage = {
        jsonrpc: "2.0",
        method: "PushMessage",
        id: 1,
        params: {
          recipient: "user-a",
          sender: "user-b",
          data: actionToRelay
        }
      };

      const {effects} = await expectSaga(messageHandler, pushMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), asAddress],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x12345";
              }
            }
          ]
        ])
        .run();

      expect(effects.put[0].payload.action).toMatchObject(actionToRelay);
    });
  });

  describe("CreateChannel", () => {
    it("handles a create channel request", async () => {
      const destinationA = Wallet.createRandom().address;
      const signingAddressA = asAddress;
      const signingAddressB = bsAddress;
      const destinationB = Wallet.createRandom().address;
      const appDefinition = Wallet.createRandom().address;
      const appData = "0x0";
      const participants = [
        {
          participantId: "user-a",
          signingAddress: signingAddressA,
          destination: destinationA
        },
        {
          participantId: "user-b",
          signingAddress: signingAddressB,
          destination: destinationB
        }
      ];
      const allocations = [
        {
          token: "0x0",
          allocationItems: [
            {destination: destinationA, amount: "0x12"},
            {destination: destinationB, amount: "0x12"}
          ]
        }
      ];
      const requestMessage = {
        jsonrpc: "2.0",
        method: "CreateChannel",
        id: 1,
        params: {
          participants,
          allocations,
          appDefinition,
          appData
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), signingAddressA],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x12345";
              }
            }
          ]
        ])
        .run();

      expect(effects.put[2].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.OWN_STATE_RECEIVED",
        state: {
          channel: {participants: [signingAddressA, signingAddressB]},
          outcome: [
            {
              assetHolderAddress: AddressZero,
              allocation: [
                {destination: convertAddressToBytes32(destinationA), amount: "0x12"},
                {destination: convertAddressToBytes32(destinationB), amount: "0x12"}
              ]
            }
          ]
        }
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.CREATE_CHANNEL_RESPONSE",
        id: 1,
        channelId: expect.any(String)
      });
      expect(effects.fork[1].payload.args[0]).toMatchObject({
        type: "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE",
        toParticipantId: "user-b",
        fromParticipantId: "user-a",
        channelId: expect.any(String)
      });
    });

    it("returns an error when the contract is not deployed", async () => {
      const destinationA = Wallet.createRandom().address;
      const signingAddressA = Wallet.createRandom().address;
      const signingAddressB = Wallet.createRandom().address;
      const destinationB = Wallet.createRandom().address;
      const appDefinition = Wallet.createRandom().address;
      const appData = "0x0";
      const participants = [
        {
          participantId: "user-a",
          signingAddress: signingAddressA,
          destination: destinationA
        },
        {
          participantId: "user-b",
          signingAddress: signingAddressB,
          destination: destinationB
        }
      ];
      const allocations = [
        {
          token: "0x0",
          allocationItems: [
            {destination: destinationA, amount: "0x12"},
            {destination: destinationB, amount: "0x12"}
          ]
        }
      ];
      const requestMessage = {
        jsonrpc: "2.0",
        method: "CreateChannel",
        id: 1,
        params: {
          participants,
          allocations,
          appDefinition,
          appData
        }
      };
      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), signingAddressA],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x";
              }
            }
          ]
        ])
        .run();

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.NO_CONTRACT_ERROR",
        id: 1
      });
    });

    it("returns an error the first participant does not have our address", async () => {
      const destinationA = Wallet.createRandom().address;
      const signingAddressA = Wallet.createRandom().address;
      const signingAddressB = bsAddress;
      const destinationB = Wallet.createRandom().address;
      const appDefinition = Wallet.createRandom().address;
      const appData = "0x0";
      const participants = [
        {
          participantId: "user-a",
          signingAddress: signingAddressA,
          destination: destinationA
        },
        {
          participantId: "user-b",
          signingAddress: signingAddressB,
          destination: destinationB
        }
      ];
      const allocations = [
        {
          token: "0x0",
          allocationItems: [
            {destination: destinationA, amount: "0x12"},
            {destination: destinationB, amount: "0x12"}
          ]
        }
      ];
      const requestMessage = {
        jsonrpc: "2.0",
        method: "CreateChannel",
        id: 1,
        params: {
          participants,
          allocations,
          appDefinition,
          appData
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([
          [matchers.fork.fn(messageSender), 0],
          [matchers.select.selector(getAddress), Wallet.createRandom().address],
          [
            matchers.call.fn(getProvider),
            {
              getCode: address => {
                return "0x";
              }
            }
          ]
        ])
        .run();

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR",
        id: 1
      });
    });
  });

  describe("UpdateChannel", () => {
    it("handles an update channel request", async () => {
      // Data being submitted to UpdateChannel
      const destinationA = Wallet.createRandom().address;
      const destinationB = Wallet.createRandom().address;
      const appData = "0x01010101";
      const allocations = [
        {
          token: "0x0",
          allocationItems: [
            {destination: destinationA, amount: "0x12"},
            {destination: destinationB, amount: "0x12"}
          ]
        }
      ];

      // Existing data in the store
      const testChannel = channelFromStates([appState({turnNum: 0})], asAddress, asPrivateKey);

      const requestMessage = {
        jsonrpc: "2.0",
        method: "UpdateChannel",
        id: 1,
        params: {
          channelId: testChannel.channelId,
          allocations,
          appData
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState({...initialState, channelStore: setChannel({}, testChannel)})
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      const state = {
        appData,
        turnNum: 1,
        outcome: [
          {
            allocation: allocations[0].allocationItems.map(a => {
              return {
                amount: a.amount,
                destination: convertAddressToBytes32(a.destination)
              };
            }),
            assetHolderAddress: AddressZero
          }
        ]
      };

      expect(effects.put[0].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.OWN_STATE_RECEIVED",
        state
      });

      expect(effects.fork[1].payload.args[0]).toMatchObject({
        type: "WALLET.UPDATE_CHANNEL_RESPONSE",
        id: 1,
        channelId: stateHelpers.channelId
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.SEND_CHANNEL_UPDATED_MESSAGE",
        channelId: stateHelpers.channelId
      });
    });

    it("returns an error when the channelId is not known", async () => {
      const unknownChannelId = "0xsomefakeid";

      const requestMessage = {
        jsonrpc: "2.0",
        method: "UpdateChannel",
        id: 1,
        params: {
          channelId: unknownChannelId, // <----- important part of the test
          allocations: [],
          appData: "0x"
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR",
        id: 1,
        channelId: unknownChannelId
      });
    });

    // TODO: Implement
    it.skip("can trigger responses to challenges if it needs to", () => {
      return;
    });
  });

  describe("CloseChannel", () => {
    it("handles an close channel request", async () => {
      const previousGameState = appState({turnNum: 20});
      const testChannel = channelFromStates([previousGameState], asAddress, asPrivateKey);

      const requestMessage = {
        jsonrpc: "2.0",
        method: "CloseChannel",
        id: 1,
        params: {
          channelId: testChannel.channelId
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState({...initialState, channelStore: setChannel({}, testChannel)})
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      expect(effects.put[0].payload.action).toMatchObject({
        type: "WALLET.NEW_PROCESS.CONCLUDE_REQUESTED"
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.CLOSE_CHANNEL_RESPONSE",
        id: 1,
        channelId: stateHelpers.channelId
      });
    });

    it("returns an error when the channelId is not known", async () => {
      const unknownChannelId = "0xsomefakeid";

      const requestMessage = {
        jsonrpc: "2.0",
        method: "CloseChannel",
        id: 1,
        params: {
          channelId: unknownChannelId // <----- important part of the test
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR",
        id: 1,
        channelId: unknownChannelId
      });
    });
  });

  describe("JoinChannel", () => {
    it("handles an join channel request", async () => {
      const existingState = appState({turnNum: 0});
      const testChannel = channelFromStates([existingState], asAddress, asPrivateKey);

      const requestMessage = {
        jsonrpc: "2.0",
        method: "JoinChannel",
        id: 1,
        params: {
          channelId: testChannel.channelId
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState({...initialState, channelStore: setChannel({}, testChannel)})
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      const nextState = {
        ...existingState.state,
        turnNum: 1
      };

      expect(effects.put[0].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.OWN_STATE_RECEIVED",
        state: nextState
      });
      expect(effects.put[1].payload.action).toMatchObject({
        type: "WALLET.NEW_PROCESS.FUNDING_REQUESTED"
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.JOIN_CHANNEL_RESPONSE",
        id: 1,
        channelId: testChannel.channelId
      });
      expect(effects.fork[1].payload.args[0]).toMatchObject({
        type: "WALLET.SEND_CHANNEL_JOINED_MESSAGE",
        channelId: testChannel.channelId
      });
    });

    it("returns an error when the channelId is not known", async () => {
      const unknownChannelId = "0xsomefakeid";

      const requestMessage = {
        jsonrpc: "2.0",
        method: "JoinChannel",
        id: 1,
        params: {
          channelId: unknownChannelId
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR",
        id: 1,
        channelId: unknownChannelId
      });
    });
  });

  describe("ChallengeChannel", () => {
    it("handles a challenge channel request", async () => {
      const existingState = appState({turnNum: 0});
      const testChannel = channelFromStates([existingState], asAddress, asPrivateKey);

      const requestMessage = {
        jsonrpc: "2.0",
        method: "ChallengeChannel",
        id: 1,
        params: {
          channelId: testChannel.channelId
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState({...initialState, channelStore: setChannel({}, testChannel)})
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      expect(effects.put[0].payload.action).toMatchObject({
        type: "WALLET.APPLICATION.CHALLENGE_REQUESTED",
        state: existingState.state,
        channelId: testChannel.channelId
      });

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.CHALLENGE_CHANNEL_RESPONSE",
        id: 1,
        channelId: testChannel.channelId
      });
    });

    it("returns an error when the channelId is not known", async () => {
      const unknownChannelId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

      const requestMessage = {
        jsonrpc: "2.0",
        method: "ChallengeChannel",
        id: 1,
        params: {
          channelId: unknownChannelId
        }
      };

      const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
        .withState(initialState)
        // Mock out the fork call so we don't actually try to post the message
        .provide([[matchers.fork.fn(messageSender), 0]])
        .run();

      expect(effects.fork[0].payload.args[0]).toMatchObject({
        type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR",
        id: 1,
        channelId: unknownChannelId
      });
    });
  });
});
