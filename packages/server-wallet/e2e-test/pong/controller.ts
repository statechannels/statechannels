import {Message} from '@statechannels/wire-format';

import {Wallet} from '../../src/wallet';

export default class PongController {
  private readonly wallet: Wallet = new Wallet();

  public async handleMessage(message: Message): Promise<Message> {
    const {channelResults} = await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });

    if (!channelResults) throw Error('sanity check');

    // Assuming MessageQueued inside the outbox
    const [
      {
        outbox: [
          {
            notice: {params},
          },
        ],
      },
      // eslint-disable-next-line
    ] = channelResults;

    return params as Message;
  }
}
