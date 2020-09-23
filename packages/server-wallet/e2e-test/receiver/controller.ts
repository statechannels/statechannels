import {makeDestination} from '@statechannels/wallet-core';
import {Participant} from '@statechannels/client-api-schema';

import {bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {Wallet, Message as Payload} from '../../src';
import {timerFactory, recordFunctionMetrics} from '../../src/metrics';
import {receiverConfig} from '../e2e-utils';
import {defaultConfig} from '../../src/config';

export default class ReceiverController {
  private readonly wallet: Wallet = recordFunctionMetrics(
    new Wallet(receiverConfig),
    defaultConfig.timingMetrics
  );

  private readonly myParticipantID: string = 'receiver';
  private time = timerFactory(defaultConfig.timingMetrics, 'controller');
  public get participantInfo(): Participant {
    return {
      participantId: this.myParticipantID,
      signingAddress: bob().address,
      destination: makeDestination(bob().address),
    };
  }

  public async acceptMessageAndReturnReplies(message: unknown): Promise<unknown> {
    const reply: Payload = {
      signedStates: [],
      objectives: [],
    };

    const {
      channelResults: [channelResult],
      outbox: [maybeSyncStateResponse],
    } = await this.time('push message', async () => this.wallet.pushMessage(message));

    if (maybeSyncStateResponse) {
      const syncResponse = maybeSyncStateResponse.params.data as Payload;
      reply.signedStates = reply.signedStates?.concat(syncResponse.signedStates || []);
      reply.objectives = reply.objectives?.concat(syncResponse.objectives || []);
    }

    if (channelResult && channelResult.turnNum % 2 === 0) {
      const {
        outbox: [messageToSendToPayer],
      } = await this.time('react', async () =>
        (channelResult.status === 'proposed' ? this.wallet.joinChannel : this.wallet.updateChannel)(
          channelResult
        )
      );

      const walletResponse = messageToSendToPayer.params.data as Payload;

      reply.signedStates = reply.signedStates?.concat(walletResponse.signedStates || []);
      reply.objectives = reply.objectives?.concat(walletResponse.objectives || []);
    }

    return reply;
  }
}
