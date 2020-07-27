import axios from 'axios';
import {Message} from '@statechannels/wire-format';

import {Wallet} from '../../src/wallet';
import {createChannelArgs} from '../../src/wallet/__test__/fixtures/create-channel';

export default class PingClient {
  private readonly wallet: Wallet = new Wallet();

  private channelId?: string;

  constructor(private readonly pongHttpServerURL: string) {
    console.log(`Created PingClient that pings ${pongHttpServerURL}`);
  }

  public async createPingChannel(): Promise<void> {
    if (this.channelId) throw Error(`PingClient channel already created: ${this.channelId}`);

    const {
      channelResults: [{channelId}],
      outbox: [{params}],
    } = await this.wallet.createChannel(
      // Re-using test fixture
      createChannelArgs()
    );

    this.channelId = channelId;

    const message = await this.messagePongAndExpectReply(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });
  }

  public async ping(): Promise<void> {
    if (!this.channelId) throw Error(`PingClient has no channel`);

    const {
      channelResults: [channel],
    } = await this.wallet.getState({channelId: this.channelId});

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
