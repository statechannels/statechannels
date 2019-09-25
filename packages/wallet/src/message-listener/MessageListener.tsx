import debug from "debug";
import React, { useState } from "react";
import { JsonRPCRequest } from "web3/providers";
import { TestMessage } from "../message-handlers/TestMessage";

type JsonRpcComponentProps = { request: JsonRPCRequest };

const components = {
  chan_test: TestMessage
};

const log = debug("wallet:message-listener");

const MessageListener: React.FC = () => {
  const [request, setRequest]: [JsonRPCRequest, (data: JsonRPCRequest) => void] = useState({} as JsonRPCRequest);

  window.addEventListener("message", (event: MessageEvent) => {
    const message = event.data as JsonRPCRequest;

    if (!message.jsonrpc) {
      return;
    }

    log("Message received: %o", message);
    setRequest(message);
  });

  const factory = React.createFactory<JsonRpcComponentProps>(components[request.method] || "div");

  return <div>{factory({ request }) || "foo"}</div>;
};

export { MessageListener };
