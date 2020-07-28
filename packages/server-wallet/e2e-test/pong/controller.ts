import {Message} from '@statechannels/wire-format';
import {SignedState} from '@statechannels/wallet-core';

import {Wallet} from '../../src/wallet';

export default class PongController {
  private readonly wallet: Wallet = new Wallet();

  public async acceptMessageAndReturnReplies(message: Message): Promise<Message> {
    const {
      recipient: to,
      sender: from,
      data: {signedStates},
    } = message;

    // FIXME: server-wallet is using wallet-core, not wire-format for
    // types of messages between parties. e2e-test uses wire-format
    const convertedSignedStates = (signedStates as unknown) as SignedState[];

    const {channelResults, outbox} = await this.wallet.pushMessage({
      signedStates: convertedSignedStates,
      to,
      from,
    });

    if (!channelResults) throw Error('sanity check');

    for (const notification of outbox) {
      if (notification.method === 'ChannelProposed') {
        console.log('Observed a ChannelProposed event');
      }
    }

    return {
      sender: 'pong',
      recipient: from,
      data: {
        signedStates: [
          /* TODO: */
        ],
        objectives: [],
      },
    };
  }
}
