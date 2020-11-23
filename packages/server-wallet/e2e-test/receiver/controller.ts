import { makeDestination } from '@statechannels/wallet-core';
import { Participant } from '@statechannels/client-api-schema';

import { bob } from '../../src/wallet/__test__/fixtures/signing-wallets';
import { Wallet, Message as Payload } from '../../src';
import { timerFactory, recordFunctionMetrics } from '../../src/metrics';
import { receiverConfig } from '../e2e-utils';
import { defaultConfig } from '../../src/config';
import { WALLET_VERSION } from '../../src/version';

export default class ReceiverController {
  private readonly wallet: Wallet = recordFunctionMetrics(
    Wallet.create(receiverConfig),
    defaultConfig.timingMetrics
  );

  public async warmup(): Promise<void> {
    this.wallet.warmUpThreads();
  }

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
      walletVersion: WALLET_VERSION,
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
      } = await this.time('react', async () => {
        if (channelResult.status === 'proposed') {
          return this.wallet.joinChannels([channelResult.channelId]);
        } else {
          return this.wallet.updateChannel(channelResult);
        }
      });

      const walletResponse = messageToSendToPayer.params.data as Payload;

      reply.signedStates = reply.signedStates?.concat(walletResponse.signedStates || []);
      reply.objectives = reply.objectives?.concat(walletResponse.objectives || []);
    }

    return reply;
  }
}
