import {
  ChannelResult,
  DomainBudget,
  Message,
  ErrorCodes,
  Allocation
} from '@statechannels/client-api-schema';

/**
 * @beta
 */
export type TokenAllocations = Allocation[];

/**
 * @beta
 */
export type UnsubscribeFunction = () => void;
export interface EventsWithArgs {
  MessageQueued: [Message];
  ChannelUpdated: [ChannelResult];
  BudgetUpdated: [DomainBudget];
  // TODO: Is `ChannelResult` the right type to use here?
  ChannelProposed: [ChannelResult];
}

/**
 * @beta
 */
export const ErrorCode: ErrorCodes = {
  EnableEthereum: {EthereumNotEnabled: 100},
  CloseAndWithdraw: {UserDeclined: 200},
  CloseChannel: {
    NotYourTurn: 300,
    ChannelNotFound: 301
  },
  UpdateChannel: {
    ChannelNotFound: 400,
    InvalidTransition: 401,
    InvalidAppData: 402,
    NotYourTurn: 403,
    ChannelClosed: 404
  }
};
