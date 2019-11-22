import {BigNumberish} from 'ethers/utils';
import {EventEmitter} from 'eventemitter3';

export type JsonRPCVersion = '2.0';

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

export interface Message {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: string; // Message payload. Format defined by wallet and opaque to app.
}

export interface Funds {
  token: string;
  amount: string;
}

export interface CreateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: string;
}
export interface ChannelResult {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: string;
  channelId: string;
  status: ChannelStatus;
  funding: Funds[];
  turnNum: BigNumberish;
}

export interface UpdateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

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

// Requests and Responses
// ======================

export type GetAddressRequest = JsonRPCRequest<'GetAddress', {}>; // todo: what are params

export type CreateChannelRequest = JsonRPCRequest<'CreateChannel', CreateChannelParameters>;

export interface CreateChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface JoinChannelParameters {
  channelId: string;
}

export type JoinChannelRequest = JsonRPCRequest<'JoinChannel', JoinChannelParameters>;

export interface JoinChannelResponse extends JsonRPCResponse<ChannelResult> {}

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

type NotificationName = Notification['method'];
type NotificationParameters = Notification['params'];

export type Request =
  | GetAddressRequest
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | PushMessageRequest
  | CloseChannelRequest;

type MethodName = Request['method'];
type ActionParameters = Request['params'];

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

export class ChannelClient {
  protected events = new EventEmitter();

  onMessageQueued(callback: (notification: Notification) => void) {
    this.events.on('MessageQueued', notification => {
      callback(notification);
    });
  }

  onChannelUpdated(callback: (notification: ChannelUpdatedNotification) => void) {
    this.events.on('ChannelUpdated', notification => {
      callback(notification);
    });
  }

  unSubscribe(notificationName: NotificationName): void {
    this.events.removeAllListeners(notificationName);
  }

  async createChannel(parameters: CreateChannelParameters) {
    await this.sendToWallet('CreateChannel', parameters);

    await this.notifyChannelProposed({
      ...parameters,
      channelId: '0x0',
      turnNum: 0,
      status: 'opening',
    } as ChannelResult);
  }

  async joinChannel(parameters: JoinChannelParameters) {
    await this.sendToWallet('JoinChannel', parameters);

    await this.notifyChannelUpdated({
      ...parameters,
      channelId: '0x0',
      status: 'running',
      turnNum: 1,
    } as ChannelResult);
  }

  async updateChannel(parameters: UpdateChannelParameters) {
    await this.sendToWallet('UpdateChannel', parameters);

    await this.notifyChannelUpdated(parameters as ChannelResult);
  }

  async pushMessage(parameters: Message) {
    await this.sendToWallet('PushMessage', parameters);
  }

  async getAddress() {
    await this.sendToWallet('GetAddress', {});
  }

  async closeChannel(parameters: CloseChannelParameters) {
    await this.sendToWallet('CloseChannel', parameters);

    await this.notifyChannelClosed({
      ...parameters,
      status: 'closing',
      turnNum: 2,
    } as ChannelResult);
  }

  protected async sendToWallet(methodName: MethodName, parameters: ActionParameters | {}) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: methodName,
      params: parameters,
    });
  }

  protected async notifyApp(
    notificationName: NotificationName,
    parameters: NotificationParameters
  ) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      method: notificationName,
      params: parameters,
    });
  }

  protected async reportErrorToApp(errorCode: ErrorCodes, id?: string) {
    this.events.emit('message', new ErrorCodesToObjectsMap[errorCode](id || ''));
  }

  protected async notifyChannelUpdated(parameters: NotificationParameters) {
    await this.notifyApp('ChannelUpdated', parameters);
  }

  protected async notifyChannelProposed(parameters: NotificationParameters) {
    await this.notifyApp('ChannelProposed', parameters);
  }

  protected async notifyChannelClosed(parameters: NotificationParameters) {
    await this.notifyApp('ChannelClosed', parameters);
  }

  protected async notifyMessageQueued(parameters: NotificationParameters) {
    await this.notifyApp('MessageQueued', parameters);
  }
}
