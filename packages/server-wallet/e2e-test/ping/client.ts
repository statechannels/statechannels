import {Client} from 'jayson';
import {Message} from '@statechannels/wire-format';

import {Wallet} from '../../src/wallet';
import {createChannelArgs} from '../../src/wallet/__test__/fixtures/create-channel';

export default class PingClient {
  private readonly wallet: Wallet = new Wallet();

  private channelId: string;

  constructor(private readonly pongHttpServerURL: string) {
    console.log(`Created PingClient that pings ${pongHttpServerURL}`);
  }

  public async createPingChannel(): Promise<void> {
    if (this.channelId) throw Error(`PingClient channel already created: ${this.channelId}`);

    const {
      channelId,
      outbox: [
        // FIXME: Fails here because createChannel does not create a message
        {
          notice: {params},
        },
      ],
    } = await this.wallet.createChannel(
      // Re-using test fixture
      createChannelArgs()
    );

    this.channelId = channelId;

    const message = await this.sendMessageToPongOverHTTP(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });
  }

  public async ping(): Promise<void> {
    const channel = await this.wallet.getChannel(this.channelId);

    // Assuming MessageQueued inside the outbox
    const {
      outbox: [
        {
          notice: {params},
        },
      ],
    } = await this.wallet.updateChannel(channel);

    const message = await this.sendMessageToPongOverHTTP(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });
  }

  private sendMessageToPongOverHTTP = (message: Message): Promise<Message> =>
    new Promise((resolve, reject) =>
      Client.http(
        (this.pongHttpServerURL + '/inbox') as any // jayson Client.http types are outdated
      ).request('inbox', message, (err: any, response: Message) =>
        err ? reject(err) : resolve(response)
      )
    );
}
