import {ChannelResult, DomainBudget, Message, ErrorCodes} from '@statechannels/client-api-schema';

export type UnsubscribeFunction = () => void;
export interface EventsWithArgs {
  MessageQueued: [Message];
  ChannelUpdated: [ChannelResult];
  BudgetUpdated: [DomainBudget];
  // TODO: Is `ChannelResult` the right type to use here?
  ChannelProposed: [ChannelResult];
}

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
