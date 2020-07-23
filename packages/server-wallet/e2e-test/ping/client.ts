import {Client} from 'jayson';
import {Message} from '@statechannels/wire-format';

import {Wallet} from '../src/wallet';

export default class PingClient {
  private readonly wallet: Wallet = new Wallet();

  constructor(private readonly channelId: string, private readonly receiverAddress: string) {
    console.log(`Created PingClient with ${channelId} and ${receiverAddress}`);
  }

  public async ping(): Promise<void> {
    const channel = await this.wallet.getChannel(this.channelId);

    const channelResult = await this.wallet.updateChannel(channel);

    // Assuming MessageQueued inside the outbox
    const {
      outbox: [
        {
          notice: {params},
        },
      ],
    } = channelResult;

    const message = await this.sendMessageViaHttp(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });
  }

  public async getBalance(): Promise<string> {
    return (await this.wallet.getChannel(this.channelId)).appData;
  }

  private sendMessageViaHttp = (message: Message): Promise<Message> =>
    new Promise((resolve, reject) =>
      Client.http(
        this.receiverAddress as any // jayson Client.http types are outdated
      ).request('sendMessage', message, (err: any, response: Message) =>
        err ? reject(err) : resolve(response)
      )
    );
}
