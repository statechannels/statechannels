import debug from "debug";
import React from "react";
import { JsonRpcComponentProps } from "../json-rpc-router";

const log = debug("wallet:handler:unicorn-message");

const UnicornMessage: React.FC<JsonRpcComponentProps> = () => {
  log("Rendered handler");
  return (
    <section data-test-selector="unicorn-message">
      <span role="img" aria-label="Unicorn">
        🦄
      </span>
    </section>
  );
};

export { UnicornMessage };
