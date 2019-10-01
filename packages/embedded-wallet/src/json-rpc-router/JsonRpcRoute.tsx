import React, {createFactory} from 'react';
import {JsonRPCRequest} from 'web3/providers';
import {JsonRpcRouterConsumer} from './JsonRpcRouter';

export type JsonRpcComponentProps = {request: JsonRPCRequest};
export type JsonRpcRouteProps = {
  method: string;
  component:
    | React.ComponentClass<JsonRpcComponentProps>
    | React.FunctionComponent<JsonRpcComponentProps>;
};

/**
 * Declares a listener component for a given JSON-RPC method.
 *
 * @example
 * ```
 * <JsonRpcRoute method="jsonrpc_doSomething" component={DoSomethingUI} />
 * ```
 *
 * @property method - The name of the JSON-RPC method.
 * @property component - A React component that will be rendered as a response to the message.
 */
const JsonRpcRoute: React.FC<JsonRpcRouteProps> = ({method, component}: JsonRpcRouteProps) => {
  return (
    <JsonRpcRouterConsumer>
      {({request}) => {
        if (request && request.method === method) {
          const handler = createFactory(component as React.ComponentClass<JsonRpcComponentProps>)({
            request
          });
          return <main data-test-selector={`handler:${method}`}>{handler}</main>;
        }

        return [];
      }}
    </JsonRpcRouterConsumer>
  );
};

export {JsonRpcRoute};
