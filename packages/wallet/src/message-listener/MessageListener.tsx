import debug from "debug";
import React, { useEffect, useState } from "react";
import { JsonRPCRequest } from "web3/providers";
import { TestMessage } from "../message-handlers/TestMessage";

type JsonRpcComponentProps = { request: JsonRPCRequest };
export type RequestReceivedCallback = (request: JsonRPCRequest) => void;

type MessageListenerProps = { onRequestReceived?: RequestReceivedCallback };

const components = {
  chan_test: TestMessage
};

const log = debug("wallet:message-listener");

const MessageListener: React.FC<MessageListenerProps> = ({ onRequestReceived }) => {
  const emptyElement = React.createElement<JsonRpcComponentProps>(React.Fragment);

  const [request, setRequest] = useState({} as JsonRPCRequest);
  const [handler, setHandler] = useState(emptyElement);

  useEffect(() => {
    window.addEventListener("message", (event: MessageEvent) => {
      const receivedRequest = event.data as JsonRPCRequest;

      if (!receivedRequest.jsonrpc) {
        return;
      }

      log("Request received: %o", receivedRequest);
      setRequest(receivedRequest);

      if (onRequestReceived) {
        onRequestReceived(receivedRequest);
      }

      setHandler(components[request.method] ? components[request.method]({ request: receivedRequest }) : emptyElement);
    });
  });

  return <main data-test-selector="message-listener">{handler}</main>;
};

export { MessageListener };
