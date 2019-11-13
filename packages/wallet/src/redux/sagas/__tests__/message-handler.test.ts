import {messageHandler} from "../message-handler";
import * as walletStates from "../../state";
import {addressResponse} from "../../actions";
import {expectSaga} from "redux-saga-test-plan";
import {Wallet} from "ethers";
import {messageSender} from "../message-sender";
import * as matchers from "redux-saga-test-plan/matchers";

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
        .provide([[matchers.fork.fn(messageSender), 0]])
        .fork(messageSender, addressResponse({id: 1, address: wallet.address}))
        .run()
    );
  });
  it("handles a create channel request", async () => {
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
          {destination: destinationA, amount: "12"},
          {destination: destinationB, amount: "12"}
        ]
      }
    ];
    const requestMessage = JSON.stringify({
      jsonrpc: "2.0",
      method: "CreateChannel",
      id: 1,
      params: {
        participants,
        allocations,
        appDefinition,
        appData
      }
    });
    const {effects} = await expectSaga(messageHandler, requestMessage, "localhost")
      .withState(initialState)
      // Mock out the fork call so we don't actually try to post the message
      .provide([[matchers.fork.fn(messageSender), 0]])
      .run();

    expect(effects.put[1].payload.action).toMatchObject({
      type: "WALLET.APPLICATION.OWN_STATE_RECEIVED",
      state: {
        channel: {participants: [signingAddressA, signingAddressB]},
        outcome: [
          {
            assetHolderAddress: "0x0",
            allocation: [
              {destination: destinationA, amount: "12"},
              {destination: destinationB, amount: "12"}
            ]
          }
        ]
      }
    });

    expect(effects.fork[0].payload.args[0]).toMatchObject({
      type: "WALLET.CREATE_CHANNEL_RESPONSE",
      participants,
      allocations,
      status: "Opening",
      funding: [],
      channelId: expect.any(String)
    });
  });
});
