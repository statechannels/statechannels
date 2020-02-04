import {One} from "ethers/constants";

import * as actions from "../../actions";
import {assetHolderStateReducer} from "../reducer";

const assetHolderAddress = "0x0";
const destination = "0x01";

describe("asset holders state reducer", () => {
  const state = {};
  describe("when a deposit event is received", () => {
    const action = actions.depositedEvent({
      processId: "0x0",
      protocolLocator: [],
      assetHolderAddress,
      destination,
      amountDeposited: One,
      destinationHoldings: One
    });
    const updatedState = assetHolderStateReducer(state, action);
    it("records the updated amount", () => {
      expect(updatedState[assetHolderAddress][destination].holdings).toEqual(One.toHexString());
    });
  });
});
