import debug from "debug";
import React from "react";

const log = debug("wallet:handler:test-message");

const closeWallet = () => {
  log("Relaying `ui:wallet:close` message");
  window.parent.postMessage("ui:wallet:close", "*");
  log("Relayed `ui:wallet:close` message");
};

const TestMessage: React.FC = () => {
  log("Rendered handler");
  return (
    <div>
      Test Message<button onClick={closeWallet}>Close</button>
    </div>
  );
};

export { TestMessage };
