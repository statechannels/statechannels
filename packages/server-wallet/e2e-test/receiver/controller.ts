import {Message as WireMessage} from '@statechannels/wire-format';
import {Message, makeDestination} from '@statechannels/wallet-core';
import {Participant} from '@statechannels/client-api-schema';

import {bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {Wallet} from '../../src/wallet';
import {timerFactory, recordFunctionMetrics} from '../../src/metrics';
import defaultConfig from '../../src/config';

export default class ReceiverController {
  private readonly wallet: Wallet = recordFunctionMetrics(
    new Wallet({...defaultConfig, postgresDBName: 'receiver'})
  );

  private readonly myParticipantID: string = 'receiver';
  private time = timerFactory('controller');
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
    } = await this.time('push message', async () => this.wallet.pushMessage(message));

    if (!signedStates || signedStates?.length === 0) {
      return {
        signedStates: [],
        objectives: [],
      };
    } else {
      const {
        outbox: [messageToSendToPayer],
      } = await this.time('react', async () =>
        (channelResult.status === 'proposed' ? this.wallet.joinChannel : this.wallet.updateChannel)(
          channelResult
        )
      );

      return (messageToSendToPayer.params as WireMessage).data as Message;
    }
  }
}
