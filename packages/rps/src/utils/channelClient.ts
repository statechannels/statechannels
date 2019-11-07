import {BigNumberish} from 'ethers/utils';
import {EventEmitter} from 'events';

export enum ChannelStatus {
  Opening = 'opening',
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

export type ActionName = MethodName | NotificationName;

// export type MessageParameters = OpenChannelParameters | JoinChannelParameters;

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

export interface Funding {
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
  funding: Funding[];
}

export interface CreateChannelRequest
  extends JsonRPCRequest<CreateChannelParameters, MethodName.CreateChannel> {}

export interface CreateChannelResult extends ChannelResult {
  turnNum: 0;
}

export interface CreateChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface JoinChannelParameters {
  channelId: string;
}

export interface JoinChannelRequest
  extends JsonRPCRequest<JoinChannelParameters, MethodName.JoinChannel> {}

export interface JoinChannelResult extends ChannelResult {
  turnNum: 1;
}

export interface JoinChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface UpdateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

export interface UpdateChannelRequest
  extends JsonRPCRequest<UpdateChannelParameters, MethodName.UpdateChannel> {}

export interface UpdateChannelResult extends ChannelResult {
  turnNum: number;
}

export interface ChannelProposedNotification
  extends JsonRPCNotification<CreateChannelResult, 'ChannelProposed'> {}

export interface ChannelUpdatedNotification
  extends JsonRPCNotification<UpdateChannelResult, 'ChannelUpdated'> {}

export type ActionParameters =
  | CreateChannelParameters
  | JoinChannelParameters
  | UpdateChannelParameters;

export class ChannelClient {
  protected events = new EventEmitter();

  onMessageReceived(
    notificationName: NotificationName,
    callback: (parameters: ActionParameters) => void
  ) {
    this.events.on(
      'message',
      (message: JsonRPCNotification<ActionParameters> | JsonRPCRequest<ActionParameters>) => {
        if (message.method === notificationName) {
          callback(message.params);
        }
      }
    );
  }

  createChannel(parameters: CreateChannelParameters) {
    this.send(MethodName.CreateChannel, parameters);

    // TODO: This notification payload is incomplete, since it doesn't have the result
    // of the channel creation. Where should this go?
    this.notifyChannelProposed(parameters as CreateChannelResult);
  }

  joinChannel(parameters: JoinChannelParameters) {
    this.send(MethodName.JoinChannel, parameters);

    // TODO: This notification payload is incomplete, since it doesn't have the result
    // of the channel creation. Where should this go?
    this.notifyChannelUpdated(parameters as UpdateChannelResult);
  }

  updateChannel(parameters: UpdateChannelParameters) {
    this.send(MethodName.UpdateChannel, parameters);
  }

  protected async send(methodName: MethodName, parameters: ActionParameters) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: methodName,
      params: parameters,
    });
  }

  protected async notify(notificationName: NotificationName, parameters: ActionParameters) {
    this.events.emit('message', {
      jsonrpc: '2.0',
      method: notificationName,
      params: parameters,
    });
  }

  protected async notifyChannelUpdated(parameters: UpdateChannelResult) {
    await this.notify(NotificationName.ChannelUpdated, parameters);
  }

  protected async notifyChannelProposed(parameters: CreateChannelResult) {
    await this.notify(NotificationName.ChannelProposed, parameters);
  }
}
