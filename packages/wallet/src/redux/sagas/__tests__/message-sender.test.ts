import {createResponseMessage} from "../message-sender";
import {addressResponse} from "../../actions";
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
});
