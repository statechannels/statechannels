import {Message as WireMessage} from '@statechannels/wire-format';
import {Message, makeDestination} from '@statechannels/wallet-core';
import {Participant} from '@statechannels/client-api-schema';

import {bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {Wallet} from '../../src/wallet';

export default class ReceiverController {
  private readonly wallet: Wallet = new Wallet();

  private readonly myParticipantID: string = 'receiver';

  public get participantInfo(): Participant {
    return {
      participantId: this.myParticipantID,
      signingAddress: bob().address,
      destination: makeDestination(bob().address),
    };
  }

  public async acceptMessageAndReturnReplies(message: Message): Promise<Message> {
    const {signedStates} = message;

    const {
      channelResults: [channelResult],
    } = await time('controller: push message', async () => this.wallet.pushMessage(message));

    if (!signedStates || signedStates?.length === 0) {
      return {
        signedStates: [],
        objectives: [],
      };
    } else {
      const {
        outbox: [messageToSendToPayer],
      } = await time('controller: react', async () =>
        (channelResult.status === 'proposed' ? this.wallet.joinChannel : this.wallet.updateChannel)(
          channelResult
        )
      );

      return (messageToSendToPayer.params as WireMessage).data as Message;
    }
  }
}

// eslint-disable-next-line no-process-env
const TIME = !!process.env.TIMING_METRICS;
async function time<T>(label: string, cb: () => Promise<T>): Promise<T> {
  if (TIME) {
    console.time(label);
    const result = await cb();
    console.timeEnd(label);
    return result;
  } else {
    return await cb();
  }
}
