import {BigNumberish} from 'ethers/utils';
import {EventEmitter} from 'eventemitter3';

export type JsonRPCVersion = '2.0';

export type ChannelStatus = 'opening' | 'funding' | 'running' | 'closing';

export type ChannelMethodName = 'CreateChannel' | 'JoinChannel' | 'UpdateChannel' | 'CloseChannel';
export type AddressMethodName = 'GetAddress';
export type MessageMethodName = 'PushMessage';

export type MethodName = ChannelMethodName | AddressMethodName | MessageMethodName;

export type ChannelNotificationName = 'ChannelProposed' | 'ChannelUpdated' | 'ChannelClosed';
export type MessageNotificationName = 'MessageQueued';

export type NotificationName = ChannelNotificationName | MessageNotificationName;

export enum ErrorCodes {
  SIGNING_ADDRESS_NOT_FOUND = 1000,
  INVALID_APP_DEFINITION = 1001,
  INVALID_APP_DATA = 1002,
  UNSUPPORTED_TOKEN = 1003,
  CHANNEL_NOT_FOUND = 1004,
}

export interface Participant {
  /**
   * App allocated id, used for relaying messages to the participant
   */
  participantId: string;

  /**
   * Address used to sign channel updates
   */
  signingAddress: string;

  /**
   * Address of EOA to receive channel proceeds (the account that'll get the funds).
   */
  destination: string;
}

export interface AllocationItem {
  /**
   * Address of EOA to receive channel proceeds.
   */
  destination: string;

  /**
   * How much funds will be transferred to the destination address.
   */
  amount: BigNumberish;
}

export interface Allocation {
  /**
   * The token's contract address.
   */
  token: string;

  /**
   * A list of allocations (how much funds will each destination address get).
   */
  allocationItems: AllocationItem[];
}

export interface Message {
  /**
   * Identifier of user that the message should be relayed to
   */
  recipient: string;

  /**
   * Identifier of user that the message is from
   */
  sender: string;

  /**
   * Message payload. Format defined by wallet and opaque to app.
   */
  data: string;
}

export type PushMessageParameters = Message;

export interface Funds {
  token: string;
  amount: string;
}

export interface JsonRPCNotification<ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: NotificationName;
  params: ParametersType;
}

export interface JsonRPCRequest<ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: MethodName;
  params: ParametersType;
  id: string;
}

export interface JsonRPCResponse<ResultType = {[key: string]: any}> {
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

export interface CreateChannelParameters extends UpdateChannelParameters {
  appDefinition: string;
}

export interface ChannelResult extends CreateChannelParameters {
  channelId: string;
  status: ChannelStatus;
  funding: Funds[];
  turnNum: BigNumberish;
}

export interface CreateChannelRequest extends JsonRPCRequest<CreateChannelParameters> {
  method: 'CreateChannel';
}

export interface CreateChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface JoinChannelParameters {
  channelId: string;
}

export interface JoinChannelRequest extends JsonRPCRequest<JoinChannelParameters> {
  method: 'JoinChannel';
}

export interface JoinChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface UpdateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

export interface UpdateChannelRequest extends JsonRPCRequest<UpdateChannelParameters> {
  method: 'UpdateChannel';
}

export interface PushMessageRequest extends JsonRPCRequest<Message> {
  method: 'PushMessage';
}

export interface PushMessageResult {
  success: boolean;
}

export interface PushMessageResponse extends JsonRPCResponse<PushMessageResult> {}

export interface CloseChannelParameters {
  channelId: string;
}

export interface CloseChannelRequest extends JsonRPCRequest<CloseChannelRequest> {}

export interface CloseChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface ChannelProposedNotification extends JsonRPCNotification<ChannelResult> {
  method: 'ChannelProposed';
}

export interface ChannelUpdatedNotification extends JsonRPCNotification<ChannelResult> {
  method: 'ChannelUpdated';
}

export interface ChannelClosingNotification extends JsonRPCNotification<ChannelResult> {
  method: 'ChannelClosed';
}

export type ActionParameters =
  | CreateChannelParameters
  | JoinChannelParameters
  | UpdateChannelParameters
  | CloseChannelParameters
  | PushMessageParameters;

export type NotificationParameters = ChannelResult | Message;

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

  onMessageReceived(
    notificationName: NotificationName,
    callback: (message: JsonRPCNotification<ActionParameters>) => void
  ): void {
    this.events.on(
      'message',
      (message: JsonRPCNotification<ActionParameters> | JsonRPCRequest<ActionParameters>) => {
        if (message.method === notificationName) {
          callback(message);
        }
      }
    );
  }

  unSubscribe(notificationName: NotificationName): void {
    this.events.removeAllListeners('message');
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
