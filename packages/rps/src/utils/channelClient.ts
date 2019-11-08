import {BigNumberish} from 'ethers/utils';
import {EventEmitter} from 'events';

export type ChannelStatus = 'opening' | 'funding' | 'running' | 'closing';

export type MethodName = 'CreateChannel' | 'JoinChannel' | 'UpdateChannel';

export type NotificationName = 'ChannelProposed' | 'ChannelUpdated';

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

export interface JsonRPCNotification<ParametersType> {
  jsonrpc: '2.0';
  method: NotificationName;
  params: ParametersType;
}

export interface JsonRPCRequest<ParametersType> {
  jsonrpc: '2.0';
  method: MethodName;
  params: ParametersType;
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

export interface ChannelProposedNotification extends JsonRPCNotification<ChannelResult> {
  method: 'ChannelProposed';
}

export interface ChannelUpdatedNotification extends JsonRPCNotification<ChannelResult> {
  method: 'ChannelUpdated';
}

export type ActionParameters =
  | CreateChannelParameters
  | JoinChannelParameters
  | UpdateChannelParameters;

export class ChannelClient {
  protected events = new EventEmitter();

  onMessageReceived(
    notificationName: NotificationName,
    callback: (parameters: ChannelResult) => void
  ): void {
    this.events.on(
      'message',
      (message: JsonRPCNotification<ActionParameters> | JsonRPCRequest<ActionParameters>) => {
        if (message.method === notificationName) {
          callback(message.params as ChannelResult);
        }
      }
    );
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

  protected async sendToWallet(methodName: MethodName, parameters: ActionParameters) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: methodName,
      params: parameters,
    });
  }

  protected async notifyApp(notificationName: NotificationName, parameters: ChannelResult) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      method: notificationName,
      params: parameters,
    });
  }

  protected async notifyChannelUpdated(parameters: ChannelResult) {
    await this.notifyApp('ChannelUpdated', parameters);
  }

  protected async notifyChannelProposed(parameters: ChannelResult) {
    await this.notifyApp('ChannelProposed', parameters);
  }
}
