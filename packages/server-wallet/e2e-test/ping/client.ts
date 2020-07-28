import axios from 'axios';
import {Message} from '@statechannels/wire-format';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Wallet} from '../../src/wallet';
import {createChannelArgs} from '../../src/wallet/__test__/fixtures/create-channel';

export default class PingClient {
  private readonly wallet: Wallet = new Wallet();

  constructor(private readonly pongHttpServerURL: string) {}

  public async getChannel(channelId: string): Promise<ChannelResult> {
    const {
      channelResults: [channel],
    } = await this.wallet.getState({channelId});

    return channel;
  }

  public async getChannels(): Promise<ChannelResult[]> {
    const {channelResults} = await this.wallet.getChannels();
    return channelResults;
  }

  public async createPingChannel(): Promise<ChannelResult> {
    const {
      outbox: [{params}],
      channelResults: [channel],
    } = await this.wallet.createChannel(
      // Re-using test fixture
      createChannelArgs()
    );

    const message = await this.messagePongAndExpectReply(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });

    return channel;
  }

  public async ping(channelId: string): Promise<void> {
    const channel = await this.getChannel(channelId);

    // Assuming MessageQueued inside the outbox
    const {
      outbox: [{params}],
    } = await this.wallet.updateChannel(channel);

    const message = await this.messagePongAndExpectReply(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });
  }

  public emptyMessage(): Promise<Message> {
    return this.messagePongAndExpectReply({
      sender: 'ping',
      recipient: 'pong',
      data: {signedStates: [], objectives: []},
    });
  }

  private async messagePongAndExpectReply(message: Message): Promise<Message> {
    const {data: reply} = await axios.post(this.pongHttpServerURL + '/inbox', {message});
    return reply;
  }
}
