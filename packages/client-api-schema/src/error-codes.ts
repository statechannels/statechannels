/**
 * Error codes that might be returned by the wallet
 *
 * @remarks
 * Errors conform to the [JSON-RPC 2.0 error spec](https://www.jsonrpc.org/specification#error_object).
Beyond the standard errors from that spec, the following domain-specific errors are possible:
 * 100: The wallet approval was rejected by the Web3 provider.
 */
export type ErrorCodes = {
  EnableEthereum: {
    EthereumNotEnabled: 100;
  };
  CloseAndWithdraw: {
    UserDeclined: 200;
  };
  CloseChannel: {
    NotYourTurn: 300;
    ChannelNotFound: 301;
  };
  UpdateChannel: {
    ChannelNotFound: 400;
    InvalidTransition: 401;
    InvalidAppData: 402;
    NotYourTurn: 403;
    ChannelClosed: 404;
  };
};
