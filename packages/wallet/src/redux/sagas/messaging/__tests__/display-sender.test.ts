import * as matchers from "redux-saga-test-plan/matchers";
import {expectSaga} from "redux-saga-test-plan";

import {displaySender} from "../display-sender";

describe("display sender", () => {
  it("sends a notification for displaying the wallet", async () => {
    const {effects} = await expectSaga(displaySender, "Show")
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.put[0].payload.action).toMatchObject({
      type: "WALLET.DISPLAY_MESSAGE_SENT"
    });
    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "UIUpdate",
      params: {
        showWallet: true
      }
    });
  });

  it("sends a notification for hiding the wallet", async () => {
    const {effects} = await expectSaga(displaySender, "Hide")
      .provide([[matchers.call.fn(window.parent.postMessage), 0]])
      .run();

    expect(effects.put[0].payload.action).toMatchObject({
      type: "WALLET.DISPLAY_MESSAGE_SENT"
    });
    expect(effects.call[0].payload.args[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "UIUpdate",
      params: {
        showWallet: false
      }
    });
  });
});
