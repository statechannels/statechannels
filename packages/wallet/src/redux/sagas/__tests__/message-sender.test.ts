import {createResponseMessage} from "../message-sender";
import {addressResponse, createChannelResponse} from "../../actions";
import {Wallet} from "ethers";

describe("create message", () => {
  it("creates a correct response message for WALLET.ADDRESS_RESPONSE", () => {
    const address = Wallet.createRandom().address;
    const result = createResponseMessage(addressResponse({id: 5, address}));
    expect(result).toEqual(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        result: address
      })
    );
  });
  it("creates a correct response message for WALLET.CREATE_CHANNEL_RESPONSE", () => {
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
    const result = createResponseMessage(message);
    expect(JSON.parse(result)).toEqual(response);
  });
});
