import debug from "debug";
import React from "react";
import { JsonRpcComponentProps } from "../json-rpc-router";

const log = debug("wallet:handler:test-message");

const closeWallet = () => {
  log("Relaying `ui:wallet:close` message");
  window.parent.postMessage("ui:wallet:close", "*");
  log("Relayed `ui:wallet:close` message");
};

const TestMessage: React.FC<JsonRpcComponentProps> = () => {
  log("Rendered handler");
  return (
    <section data-test-selector="test-message">
      Test Message<button onClick={closeWallet}>Close</button>
    </section>
  );
};

export { TestMessage };
