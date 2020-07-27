import {Message} from '@statechannels/wire-format';

import {Wallet} from '../../src/wallet';

export default class PongController {
  private readonly wallet: Wallet = new Wallet();

  public async acceptMessageAndReturnReplies(message: Message): Promise<Message> {
    const {recipient, sender} = message;

    const {channelResults, outbox} = await this.wallet.pushMessage({
      ...message,
      to: recipient,
      from: sender,
    });

    if (!channelResults) throw Error('sanity check');

    for (const notification of outbox) {
      if (notification.method === 'ChannelProposed') {
        console.log('Observed a ChannelProposed event');
      }
    }

    return {
      sender: 'pong',
      recipient: sender,
      data: {
        signedStates: [
          /* TODO: */
        ],
        objectives: [],
      },
    };
  }
}
