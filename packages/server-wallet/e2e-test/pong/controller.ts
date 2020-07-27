import {Message} from '@statechannels/wire-format';

import {Wallet} from '../../src/wallet';

export default class PongController {
  private readonly wallet: Wallet = new Wallet();

  public async handleMessage(message: Message): Promise<void> {
    const {channelResults, outbox} = await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });

    if (!channelResults) throw Error('sanity check');

    for (const notification of outbox) {
      if (notification.method === 'ChannelProposed') {
        console.log('Observed a ChannelProposed event');
      }
    }
  }
}
