import {
  PushMessageResult,
  ChannelResult,
  Participant,
  Allocation,
  SiteBudget,
  Message
} from '@statechannels/client-api-schema';

export type UnsubscribeFunction = () => void;

// The message Payload is designed to be opaque to the app. However, it's useful
// to be able to specify the Payload type for the FakeChannelClient, as we'll be
// manipulating it within the client.
export interface ChannelClientInterface<Payload = object> {
  /*
    Queuing a message is meant for when the app receives messages from
    the wallet meant for the opponent's app (and hence the opponent's wallet).
  */
  onMessageQueued: (callback: (message: Message<Payload>) => void) => UnsubscribeFunction;
  onChannelUpdated: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
  onChannelProposed: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
  /*
    Pushing a message is meant for when the app receives a message from
    the opponent's app meant for the wallet.
  */
  pushMessage: (message: Message<Payload>) => Promise<PushMessageResult>;
  createChannel: (
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ) => Promise<ChannelResult>;
  joinChannel: (channelId: string) => Promise<ChannelResult>;
  updateChannel: (
    channelId: string,
    participants: Participant[],
    allocations: Allocation[],
    appData: string
  ) => Promise<ChannelResult>;
  getState: (channelId: string) => Promise<ChannelResult>;
  challengeChannel: (channelId: string) => Promise<ChannelResult>;
  closeChannel: (channelId: string) => Promise<ChannelResult>;
  enableEthereum: () => Promise<string>;
  getAddress: () => Promise<string>;
  getEthereumSelectedAddress: () => Promise<string>;
  approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerOutcomeAddress: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<SiteBudget>;
  getBudget(hubAddress: string): Promise<SiteBudget | {}>;
  closeAndWithdraw(hubAddress: string): Promise<SiteBudget | {}>;
}
export interface EventsWithArgs {
  MessageQueued: [Message<ChannelResult>];
  ChannelUpdated: [ChannelResult];
  BudgetUpdated: [SiteBudget];
  // TODO: Is `ChannelResult` the right type to use here?
  ChannelProposed: [ChannelResult];
}

type UnsubscribeFunction = () => void;
