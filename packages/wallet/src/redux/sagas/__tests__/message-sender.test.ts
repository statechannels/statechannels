import {addressResponse, createChannelResponse} from "../../actions";
import {Wallet} from "ethers";
import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {messageSender} from "../message-sender";

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
    const channelId = Wallet.createRandom().address;
    const message = createChannelResponse({
      id: 1,
      participants,
      allocations,
      appData,
      appDefinition,
      funding: [],
      turnNum: 0,
      status: "Opening",
      channelId
    });
    const response = {
      jsonrpc: "2.0",

      id: 1,
      result: {
        participants,
        allocations,
        appData,
        appDefinition,
        funding: [],
        turnNum: 0,
        status: "Opening",
        channelId
      }
    };
    const {effects} = await expectSaga(messageSender, message)
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(JSON.parse(effects.call[0].payload.args[0])).toEqual(response);
  });
});
