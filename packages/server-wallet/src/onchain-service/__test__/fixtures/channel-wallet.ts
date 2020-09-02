import {
  JoinChannelParams,
  UpdateChannelParams,
  CloseChannelParams,
  GetStateParams,
  StateChannelsNotification,
  ChannelResult,
} from '@statechannels/client-api-schema';
import {Message, Participant} from '@statechannels/wallet-core';

import {WalletInterface, CreateChannelParams, UpdateChannelFundingParams} from '../../../wallet';
import {Outgoing} from '../../../protocols/actions';
import {OnchainServiceInterface} from '../..';

type SingleChannelResult = Promise<{outbox: Outgoing[]; channelResult: ChannelResult}>;
type MultipleChannelResult = Promise<{outbox: Outgoing[]; channelResults: ChannelResult[]}>;

export class MockWallet implements WalletInterface {
  public getParticipant(): Promise<Participant | undefined> {
    throw new Error('Method not implemented in MockWallet');
  }

  public async getSigningAddress(): Promise<string> {
    throw new Error('Method not implemented in MockWallet');
  }

  public createChannel(_args: CreateChannelParams): SingleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public joinChannel(_args: JoinChannelParams): SingleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public updateChannel(_args: UpdateChannelParams): SingleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public closeChannel(_args: CloseChannelParams): SingleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public getChannels(): MultipleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }
  public getState(_args: GetStateParams): SingleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public updateChannelFunding(_args: UpdateChannelFundingParams): SingleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public pushMessage(_m: Message): MultipleChannelResult {
    throw new Error('Method not implemented in MockWallet');
  }

  public onNotification(
    _cb: (notice: StateChannelsNotification) => void
  ): {unsubscribe: () => void} {
    throw new Error('Method not implemented in MockWallet');
  }

  // Register chain <-> Wallet communication
  public attachChainService(provider: OnchainServiceInterface): void {
    return provider.attachChannelWallet(this);
  }
}
