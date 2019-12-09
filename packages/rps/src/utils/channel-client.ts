import {Wallet} from 'ethers';
import {BigNumberish, bigNumberify} from 'ethers/utils';
import {EventEmitter} from 'eventemitter3';

const FAKE_DELAY = 100; // ms
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

export enum ErrorCodes {
  SIGNING_ADDRESS_NOT_FOUND = 1000,
  INVALID_APP_DEFINITION = 1001,
  INVALID_APP_DATA = 1002,
  UNSUPPORTED_TOKEN = 1003,
  CHANNEL_NOT_FOUND = 1004,
}

export interface Participant {
  participantId: string; // App allocated id, used for relaying messages to the participant
  signingAddress: string; // Address used to sign channel updates
  destination: string; // Address of EOA to receive channel proceeds (the account that'll get the funds).
}

export interface AllocationItem {
  destination: string; // Address of EOA to receive channel proceeds.
  amount: BigNumberish; // How much funds will be transferred to the destination address.
}

export interface Allocation {
  token: string; // The token's contract address.
  allocationItems: AllocationItem[]; // A list of allocations (how much funds will each destination address get).
}

export interface Message<T = any> {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: T; // Message payload. Format defined by wallet and opaque to app.
  // But useful to be able to specify, for the purposes of the fake-client
}

export interface Funds {
  token: string;
  amount: string;
}

export interface ChannelResult {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: string;
  channelId: string;
  status: ChannelStatus;
  // funding: Funds[]; // do we even need this?
  turnNum: string;
}

type UnsubscribeFunction = () => void;

// The message Payload is designed to be opaque to the app. However, it's useful
// to be able to specify the Payload type for the FakeChannelClient, as we'll be
// manipulating it within the client.
export interface IChannelClient<Payload = any> {
  onMessageQueued: (callback: (message: Message<Payload>) => void) => UnsubscribeFunction;
  onChannelUpdated: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
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
  closeChannel: (channelId: string) => Promise<ChannelResult>;
  pushMessage: (message: Message<Payload>) => Promise<PushMessageResult>;
  getAddress: () => Promise<string>;
}

interface EventsWithArgs {
  MessageQueued: [Message<ChannelResult>];
  ChannelUpdated: [ChannelResult];
}
export class FakeChannelClient implements IChannelClient<ChannelResult> {
  playerIndex: 0 | 1;
  protected events = new EventEmitter<EventsWithArgs>();
  protected latestState?: ChannelResult;
  protected address: string;
  protected opponentAddress: string;

  constructor() {
    this.address = Wallet.createRandom().address;
  }

  onMessageQueued(callback: (message: Message) => void): UnsubscribeFunction {
    this.events.on('MessageQueued', message => {
      callback(message);
    });
    return () => this.events.removeListener('MessageQueued', callback);
  }

  onChannelUpdated(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.events.on('ChannelUpdated', result => {
      callback(result);
    });
    return () => this.events.removeListener('ChannelUpdated', callback);
  }

  async createChannel(
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    this.playerIndex = 0;
    this.latestState = {
      participants,
      allocations,
      appDefinition,
      appData,
      channelId: '0xabc234',
      turnNum: bigNumberify(0).toString(),
      status: 'proposed',
    };
    this.opponentAddress = this.latestState.participants[1].participantId;
    // [assuming we're working with 2-participant channels for the time being]
    await sleep(FAKE_DELAY);
    this.notifyOpponent(this.latestState);

    return Promise.resolve(this.latestState);
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    this.playerIndex = 1;
    const latestState = this.findChannel(channelId);
    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.latestState = {...latestState, turnNum: bigNumberify(3).toString(), status: 'running'};
    this.opponentAddress = this.latestState.participants[0].participantId;
    await sleep(FAKE_DELAY);
    this.notifyOpponent(this.latestState);

    return Promise.resolve(this.latestState);
  }

  async updateChannel(
    channelId: string,
    participants: Participant[],
    allocations: Allocation[],
    appData: string
  ): Promise<ChannelResult> {
    const latestState = this.findChannel(channelId);
    const currentTurnNum = bigNumberify(latestState.turnNum);

    const nextState = {...latestState, participants, allocations, appData};
    if (nextState !== latestState) {
      if (currentTurnNum.mod(2).eq(this.playerIndex)) {
        return Promise.reject(
          `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
        );
      }
      nextState.turnNum = currentTurnNum.add(1).toString();
      console.log(this.playerIndex + '  updated channel to turnNum:' + nextState.turnNum);
    }

    this.latestState = nextState;

    this.notifyOpponent(this.latestState);
    return Promise.resolve(this.latestState);
  }

  async pushMessage(parameters: Message<ChannelResult>): Promise<PushMessageResult> {
    this.latestState = parameters.data;
    this.notifyApp(this.latestState);

    // auto-close, if we received a close
    if (parameters.data.status === 'closing') {
      const turnNum = bigNumberify(this.latestState.turnNum)
        .add(1)
        .toString();
      this.latestState = {...this.latestState, turnNum, status: 'closed'};
      this.notifyOpponent(this.latestState);
      this.notifyApp(this.latestState);
    }

    return Promise.resolve({success: true});
  }

  async getAddress() {
    return Promise.resolve(this.address);
  }

  async closeChannel(channelId: string) {
    const latestState = this.findChannel(channelId);
    const currentTurnNum = bigNumberify(latestState.turnNum);

    if (currentTurnNum.mod(2).eq(this.playerIndex)) {
      return Promise.reject(
        `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
      );
    }

    const turnNum = currentTurnNum.add(1).toString();
    console.log(this.playerIndex + '  updated channel to turnNum:' + turnNum);

    this.latestState = {...latestState, turnNum, status: 'closing'};
    this.notifyOpponent(this.latestState);

    return Promise.resolve(this.latestState);
  }

  protected notifyOpponent(data: ChannelResult) {
    const sender = this.address;
    const recipient = this.opponentAddress;

    this.events.emit('MessageQueued', {sender, recipient, data});
  }

  protected notifyApp(data: ChannelResult) {
    this.events.emit('ChannelUpdated', data);
  }

  protected findChannel(channelId: string): ChannelResult {
    if (!(this.latestState && this.latestState.channelId === channelId)) {
      throw Error(`Channel does't exist with channelId '${channelId}'`);
    }
    return this.latestState;
  }
}

// Json RPC stuff
// will be relevant when we build the non-fake channel client

export type JsonRPCVersion = '2.0';
export interface JsonRPCNotification<Name, ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: Name;
  params: ParametersType;
}

export interface JsonRPCRequest<Name, ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: Name;
  params: ParametersType;
  id: string;
}

export interface JsonRPCResponse<ResultType> {
  jsonrpc: JsonRPCVersion;
  id: string;
  result: ResultType;
}

export interface JsonRPCError {
  code: number;
  message: string;
  data?: {[key: string]: any};
}

export interface JsonRPCErrorResponse<ErrorType extends JsonRPCError = JsonRPCError> {
  jsonrpc: JsonRPCVersion;
  id: string;
  error: ErrorType;
}

interface CreateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: string;
  appData: string;
}

interface UpdateChannelParameters {
  channelId: string;
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

// Requests and Responses
// ======================

export type GetAddressRequest = JsonRPCRequest<'GetAddress', {}>; // todo: what are params

export type CreateChannelRequest = JsonRPCRequest<'CreateChannel', CreateChannelParameters>;

export type CreateChannelResponse = JsonRPCResponse<ChannelResult>;

export interface JoinChannelParameters {
  channelId: string;
}

export type JoinChannelRequest = JsonRPCRequest<'JoinChannel', JoinChannelParameters>;

export type JoinChannelResponse = JsonRPCResponse<ChannelResult>;

export type UpdateChannelRequest = JsonRPCRequest<'UpdateChannel', UpdateChannelParameters>;

export type PushMessageRequest = JsonRPCRequest<'PushMessage', Message>;

export interface PushMessageResult {
  success: boolean;
}

export type PushMessageResponse = JsonRPCResponse<PushMessageResult>;

export interface CloseChannelParameters {
  channelId: string;
}
export type CloseChannelRequest = JsonRPCRequest<'CloseChannel', CloseChannelParameters>;
export type CloseChannelResponse = JsonRPCResponse<ChannelResult>;

export type ChannelProposedNotification = JsonRPCNotification<'ChannelProposed', ChannelResult>;
export type ChannelUpdatedNotification = JsonRPCNotification<'ChannelUpdated', ChannelResult>;
export type ChannelClosingNotification = JsonRPCNotification<'ChannelClosed', ChannelResult>;

export type MessageQueuedNotification = JsonRPCNotification<'MessageQueued', Message>;

export type Notification =
  | ChannelProposedNotification
  | ChannelUpdatedNotification
  | ChannelClosingNotification
  | MessageQueuedNotification;

export type NotificationName = Notification['method'];

export type Request =
  | GetAddressRequest
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | PushMessageRequest
  | CloseChannelRequest;

export class ChannelClientError implements JsonRPCErrorResponse {
  jsonrpc: JsonRPCVersion = '2.0';

  error: JsonRPCError = {
    code: ErrorCodes.SIGNING_ADDRESS_NOT_FOUND,
    message: 'Something went wrong',
  };

  constructor(public readonly id: string) {}

  toJSON() {
    return {
      jsonrpc: this.jsonrpc,
      id: this.id,
      error: this.error,
    };
  }
}

export class SigningAddressNotFoundError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.SIGNING_ADDRESS_NOT_FOUND,
    message: 'Signing address not found',
  };
}

export class InvalidAppDefinitionError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.INVALID_APP_DEFINITION,
    message: 'Invalid app definition',
  };
}

export class InvalidAppDataError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.INVALID_APP_DATA,
    message: 'Invalid app data',
  };
}

export class UnsupportedTokenError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.UNSUPPORTED_TOKEN,
    message: 'Unsupported token',
  };
}

export class ChannelNotFoundError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.CHANNEL_NOT_FOUND,
    message: 'Channel not found',
  };
}

export const ErrorCodesToObjectsMap: {[key in ErrorCodes]: typeof ChannelClientError} = {
  [ErrorCodes.CHANNEL_NOT_FOUND]: ChannelNotFoundError,
  [ErrorCodes.INVALID_APP_DATA]: InvalidAppDataError,
  [ErrorCodes.INVALID_APP_DEFINITION]: InvalidAppDefinitionError,
  [ErrorCodes.SIGNING_ADDRESS_NOT_FOUND]: SigningAddressNotFoundError,
  [ErrorCodes.UNSUPPORTED_TOKEN]: UnsupportedTokenError,
};
