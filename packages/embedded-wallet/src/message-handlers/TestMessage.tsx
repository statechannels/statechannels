import debug from "debug";
import React from "react";
import { JsonRpcComponentProps } from "../json-rpc-router";
import { Dialog } from "../ui/dialog/Dialog";

const log = debug("wallet:handler:test-message");

const closeWallet = () => {
  log("Relaying `ui:wallet:close` message");
  window.parent.postMessage("ui:wallet:close", "*");
  log("Relayed `ui:wallet:close` message");
};

const TestMessage: React.FC<JsonRpcComponentProps> = () => {
  log("Rendered handler");
  return (
    <Dialog
      title="Embedded Wallet has received a test message."
      buttons={{ primary: { label: "Neat!", onClick: closeWallet } }}
      onClose={closeWallet}
    >
      This is what the UI would look like.
    </Dialog>
  );
};

export { TestMessage };
