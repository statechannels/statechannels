import {BigNumberish} from 'ethers/utils';
import {EventEmitter} from 'events';

export enum ChannelStatus {
  Opening = 'opening',
  Funding = 'funding',
  Running = 'running',
  Closing = 'closing',
}

export enum MethodName {
  CreateChannel = 'CreateChannel',
  JoinChannel = 'JoinChannel',
  UpdateChannel = 'UpdateChannel',
}

export enum NotificationName {
  ChannelProposed = 'ChannelProposed',
  ChannelUpdated = 'ChannelUpdated',
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
   * Identifier or user that the message should be relayed to
   */
  participantId: string;

  /**
   * Message payload. Format defined by wallet and opaque to app.
   */
  data: string;
}

export interface Funds {
  token: string;
  amount: string;
}

export interface ParameterHash {
  [key: string]: any;
}

export interface JsonRPCNotification<ParametersType = ParameterHash, MethodType = string> {
  jsonrpc: '2.0';
  method: MethodType;
  params: ParametersType;
}

export interface JsonRPCRequest<ParametersType = ParameterHash, MethodType = string>
  extends JsonRPCNotification<ParametersType, MethodType> {
  id: string;
}

export interface JsonRPCResponse<ResultType = {[key: string]: any}> {
  jsonrpc: '2.0';
  id: string;
  result: ResultType;
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

export interface CreateChannelRequest
  extends JsonRPCRequest<CreateChannelParameters, MethodName.CreateChannel> {}

export interface CreateChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface JoinChannelParameters {
  channelId: string;
}

export interface JoinChannelRequest
  extends JsonRPCRequest<JoinChannelParameters, MethodName.JoinChannel> {}

export interface JoinChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface UpdateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

export interface UpdateChannelRequest
  extends JsonRPCRequest<UpdateChannelParameters, MethodName.UpdateChannel> {}

export interface ChannelProposedNotification
  extends JsonRPCNotification<ChannelResult, 'ChannelProposed'> {}

export interface ChannelUpdatedNotification
  extends JsonRPCNotification<ChannelResult, 'ChannelUpdated'> {}

export type ActionParameters =
  | CreateChannelParameters
  | JoinChannelParameters
  | UpdateChannelParameters;

export interface ParametersByMessageListener {
  [NotificationName.ChannelProposed]: ChannelResult;
  [NotificationName.ChannelUpdated]: ChannelResult;
}

export type MessageListenerParameters<T extends NotificationName> = ParametersByMessageListener[T];

export class ChannelClient {
  protected events = new EventEmitter();

  onMessageReceived<T extends NotificationName>(
    notificationName: T,
    callback: (parameters: MessageListenerParameters<T>) => void
  ): void {
    this.events.on(
      'message',
      (message: JsonRPCNotification<ActionParameters> | JsonRPCRequest<ActionParameters>) => {
        if (message.method === notificationName) {
          callback(message.params as MessageListenerParameters<T>);
        }
      }
    );
  }

  async createChannel(parameters: CreateChannelParameters) {
    this.sendToWallet(MethodName.CreateChannel, parameters);

    // TODO: This notification payload is incomplete, since it doesn't have the result
    // of the channel creation. Where should this go?
    this.notifyChannelProposed(parameters as ChannelResult);
  }

  async joinChannel(parameters: JoinChannelParameters) {
    this.sendToWallet(MethodName.JoinChannel, parameters);

    // TODO: This notification payload is incomplete, since it doesn't have the result
    // of the channel creation. Where should this go?
    this.notifyChannelUpdated(parameters as ChannelResult);
  }

  async updateChannel(parameters: UpdateChannelParameters) {
    this.sendToWallet(MethodName.UpdateChannel, parameters);
  }

  protected async sendToWallet(methodName: MethodName, parameters: ActionParameters) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: methodName,
      params: parameters,
    });
  }

  protected async notifyApp(notificationName: NotificationName, parameters: ActionParameters) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      method: notificationName,
      params: parameters,
    });
  }

  protected async notifyChannelUpdated(parameters: ChannelResult) {
    await this.notifyApp(NotificationName.ChannelUpdated, parameters);
  }

  protected async notifyChannelProposed(parameters: ChannelResult) {
    await this.notifyApp(NotificationName.ChannelProposed, parameters);
  }
}
