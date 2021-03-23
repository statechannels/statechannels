import EventEmitter from 'eventemitter3';
import {
  ChannelProviderInterface,
  OnType,
  OffType,
  EventType,
  WalletJsonRpcAPI
} from '@statechannels/iframe-channel-provider';
import {
  ChannelResult,
  CloseChannelParams,
  CreateChannelParams,
  GetStateParams,
  JoinChannelParams,
  PushMessageResult,
  DomainBudget,
  UpdateChannelParams,
  Message,
  PushMessageParams
} from '@statechannels/client-api-schema';
import {Wallet} from 'ethers';
import log = require('loglevel');

import {calculateChannelId} from '../../src/utils';

type ChannelId = string;

/*
 This fake provider becomes the stateful object which handles the calls
 coming from a non-fake `ChannelClient`.
 */
export class FakeChannelProvider implements ChannelProviderInterface {
  public signingAddress?: string;
  public destinationAddress?: string;
  public walletVersion?: string;

  protected events = new EventEmitter<EventType>();
  protected url = '';

  playerIndex: Record<ChannelId, 0 | 1> = {};
  opponentIndex: Record<ChannelId, 0 | 1> = {};
  internalAddress: string = Wallet.createRandom().address;
  opponentAddress: Record<ChannelId, string> = {};
  latestState: Record<ChannelId, ChannelResult> = {};

  async send<M extends keyof WalletJsonRpcAPI>(
    method: M,
    params: WalletJsonRpcAPI[M]['request']['params']
  ): Promise<WalletJsonRpcAPI[M]['response']['result']> {
    switch (method) {
      case 'CreateChannel':
        return this.createChannel(params as CreateChannelParams);

      case 'PushMessage':
        return this.pushMessage(params as PushMessageParams);

      case 'GetWalletInformation':
        return {
          signingAddress: this.getAddress(),
          destinationAddress: '0xEthereumAddress',
          walletVersion: 'FakeChannelProvider@VersionTBD'
        };

      case 'JoinChannel':
        return this.joinChannel(params as JoinChannelParams);

      case 'GetState':
        return this.getState(params as GetStateParams);

      case 'UpdateChannel':
        return this.updateChannel(params as UpdateChannelParams);

      case 'CloseChannel':
        return this.closeChannel(params as CloseChannelParams);

      default:
        return Promise.reject(`No callback available for ${method}`);
    }
  }

  on: OnType = (method, params) => this.events.on(method, params);

  off: OffType = (method, params) => this.events.off(method, params);

  subscribe(): Promise<string> {
    return Promise.resolve('success');
  }
  unsubscribe(): Promise<boolean> {
    return Promise.resolve(true);
  }

  setState(state: ChannelResult): void {
    this.latestState = {...this.latestState, [state.channelId]: state};
  }

  setAddress(address: string): void {
    this.internalAddress = address;
  }

  updatePlayerIndex(channelId: ChannelId, playerIndex: 0 | 1): void {
    if (this.playerIndex[channelId] === undefined) {
      this.playerIndex[channelId] = playerIndex;
      this.opponentIndex[channelId] = playerIndex == 1 ? 0 : 1;
    }
  }

  protected getAddress(): string {
    if (this.internalAddress === undefined) {
      throw Error('No address has been set yet');
    }
    return this.internalAddress;
  }

  protected getPlayerIndex(channelId: ChannelId): number {
    if (this.playerIndex === undefined) {
      throw Error(`This client does not have its player index set yet`);
    }
    return this.playerIndex[channelId];
  }

  public getOpponentIndex(channelId: ChannelId): number {
    if (this.opponentIndex[channelId] === undefined) {
      throw Error(`This client does not have its opponent player index set yet`);
    }
    return this.opponentIndex[channelId];
  }

  public verifyTurnNum(channelId: ChannelId, turnNum: number): Promise<void> {
    if (turnNum % 2 === this.getPlayerIndex(channelId)) {
      return Promise.reject(
        `Not your turn: currentTurnNum = ${turnNum}, index = ${this.playerIndex[channelId]}`
      );
    }
    return Promise.resolve();
  }

  public findChannel(channelId: string): ChannelResult {
    if (!Object.keys(this.latestState).includes(channelId)) {
      throw Error(`Channel doesn't exist with channelId '${JSON.stringify(channelId, null, 4)}'`);
    }
    return this.latestState[channelId];
  }

  protected async createChannel(params: CreateChannelParams): Promise<ChannelResult> {
    const participants = params.participants;
    const allocations = params.allocations;
    const appDefinition = params.appDefinition;
    const appData = params.appData;

    const channel: ChannelResult = {
      participants,
      allocations,
      appDefinition,
      appData,
      channelId: calculateChannelId(participants, appDefinition),
      turnNum: 0,
      status: 'proposed'
    };
    this.updatePlayerIndex(channel.channelId, 0);
    this.setState(channel);
    this.internalAddress = channel.participants[0].participantId;
    this.opponentAddress[channel.channelId] = channel.participants[1].participantId;
    this.notifyOpponent(channel, 'CreateChannel');

    return channel;
  }

  protected async joinChannel(params: JoinChannelParams): Promise<ChannelResult> {
    const {channelId} = params;
    const latestState = this.findChannel(channelId);
    this.updatePlayerIndex(channelId, 1);
    log.debug(`Player ${this.getPlayerIndex(channelId)} joining channel ${channelId}`);
    await this.verifyTurnNum(channelId, latestState.turnNum);

    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.setState({
      ...latestState,
      turnNum: 3,
      status: 'running'
    });
    this.opponentAddress[channelId] = latestState.participants[0].participantId;
    this.notifyOpponent(this.latestState[channelId], 'joinChannel');

    return this.latestState[channelId];
  }

  protected async getState({channelId}: GetStateParams): Promise<ChannelResult> {
    return this.findChannel(channelId);
  }

  protected async updateChannel(params: UpdateChannelParams): Promise<ChannelResult> {
    const channelId = params.channelId;
    const allocations = params.allocations;
    const appData = params.appData;

    log.debug(`Player ${this.getPlayerIndex(channelId)} updating channel ${channelId}`);
    const latestState = this.findChannel(channelId);

    const nextState = {...latestState, allocations, appData};
    await this.verifyTurnNum(channelId, latestState.turnNum);
    nextState.turnNum = latestState.turnNum + 1;
    log.debug(
      `Player ${this.getPlayerIndex(channelId)} updated channel to turnNum ${nextState.turnNum}`
    );

    this.setState(nextState);

    this.notifyOpponent(this.latestState[channelId], 'ChannelUpdate');
    return this.latestState[channelId];
  }

  protected async closeChannel(params: CloseChannelParams): Promise<ChannelResult> {
    const latestState = this.findChannel(params.channelId);

    await this.verifyTurnNum(params.channelId, latestState.turnNum);
    const turnNum = latestState.turnNum + 1;

    const status = 'closing';

    this.setState({...latestState, turnNum, status});
    log.debug(
      `Player ${this.getPlayerIndex(
        params.channelId
      )} updated channel to status ${status} on turnNum ${turnNum}`
    );
    this.notifyOpponent(this.latestState[params.channelId], 'ChannelUpdate');

    return this.latestState[params.channelId];
  }

  // TODO: Craft a full message
  protected notifyAppChannelUpdated(data: ChannelResult): void {
    this.events.emit('ChannelUpdated', data);
  }
  protected notifyAppBudgetUpdated(data: DomainBudget): void {
    this.events.emit('BudgetUpdated', data);
  }

  protected notifyOpponent(data: ChannelResult, notificationType: string): void {
    log.debug(
      `${this.getPlayerIndex(data.channelId)} notifying opponent ${this.getOpponentIndex(
        data.channelId
      )} about ${notificationType}`
    );
    const sender = this.internalAddress;
    const recipient: string = this.opponentAddress[data.channelId];

    if (!recipient) {
      throw Error(`Cannot notify opponent - opponent address not set`);
    }
    this.events.emit('MessageQueued', {sender, recipient, data});
  }

  protected isChannelResult(data: unknown): data is ChannelResult {
    return typeof data === 'object' && data != null && 'turnNum' in data;
  }

  protected async pushMessage(params: Message): Promise<PushMessageResult> {
    if (this.isChannelResult(params.data)) {
      this.setState(params.data);
      this.notifyAppChannelUpdated(this.latestState[params.data.channelId]);
      const channel: ChannelResult = params.data;
      const turnNum = channel.turnNum + 1;
      switch (params.data.status) {
        case 'proposed':
          this.events.emit('ChannelProposed', channel);
          break;
        // auto-close, if we received a close
        case 'closing':
          this.setState({...this.latestState[channel.channelId], turnNum, status: 'closed'});
          this.notifyOpponent(this.latestState[channel.channelId], 'ChannelUpdate');
          this.notifyAppChannelUpdated(this.latestState[channel.channelId]);
          break;
        default:
          break;
      }
    }
    return {success: true};
  }
}
