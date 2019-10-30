import debug from 'debug';
import React, {createContext, useEffect, useState} from 'react';
import {JsonRpcRequest} from '../types';

const log = debug('wallet:jsonrpc-router');

export type JsonRpcRouterState = {request?: JsonRpcRequest};
const JsonRpcRouterContext = createContext<JsonRpcRouterState>({
  request: undefined
});

/**
 * Creates a Router that listens to JSON-RPC payloads sent via window.postMessage().
 * Use the `JsonRpcRoute` component to map methods to components.
 *
 * @example
 * ```
 * <JsonRpcRouter>
 *   <JsonRpcRoute method="jsonrpc_doSomething" component={DoSomethingUI} />
 *   <JsonRpcRoute method="jsonrpc_doSomethingElse" component={DoSomethingElseUI} />
 * </JsonRpcRouter>
 * ```
 */
const JsonRpcRouter: React.FC = ({children}) => {
  const [state, setState] = useState<JsonRpcRouterState>({});

  useEffect(() => {
    window.addEventListener('message', (event: MessageEvent) => {
      const receivedRequest = event.data as JsonRpcRequest;

      if (!receivedRequest.jsonrpc) {
        return;
      }

      log('Request received: %o', receivedRequest);
      setState({request: receivedRequest});

      window.parent.postMessage('ui:wallet:ack', '*');
    });
  }, []);

  return <JsonRpcRouterContext.Provider value={state}>{children}</JsonRpcRouterContext.Provider>;
};

export {JsonRpcRouter};
export const JsonRpcRouterConsumer = JsonRpcRouterContext.Consumer;
