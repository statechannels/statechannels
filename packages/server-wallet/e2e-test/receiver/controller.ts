import {makeDestination} from '@statechannels/wallet-core';
import {Participant} from '@statechannels/client-api-schema';

import {bob} from '../../src/engine/__test__/fixtures/signing-wallets';
import {Engine, Message as Payload, MultiThreadedEngine} from '../../src';
import {timerFactory, recordFunctionMetrics} from '../../src/metrics';
import {receiverConfig} from '../e2e-utils';
import {defaultConfig} from '../../src/config';
import {WALLET_VERSION} from '../../src/version';

export default class ReceiverController {
  static async create(): Promise<ReceiverController> {
    const engine = recordFunctionMetrics(
      await Engine.create(receiverConfig),
      defaultConfig.metricsConfiguration.timingMetrics
    );
    return new ReceiverController(engine);
  }

  private constructor(private readonly engine: Engine) {}

  public async warmup(): Promise<void> {
    this.engine instanceof MultiThreadedEngine && (await this.engine.warmUpThreads());
  }

  private readonly myParticipantID: string = 'receiver';
  private time = timerFactory(defaultConfig.metricsConfiguration.timingMetrics, 'controller');
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
    } = await this.time('push message', async () => this.engine.pushMessage(message));

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
          return this.engine.joinChannels([channelResult.channelId]);
        } else {
          return this.engine.updateChannel(channelResult);
        }
      });

      const engineResponse = messageToSendToPayer.params.data as Payload;

      reply.signedStates = reply.signedStates?.concat(engineResponse.signedStates || []);
      reply.objectives = reply.objectives?.concat(engineResponse.objectives || []);
    }

    return reply;
  }

  public async acceptPaymentAndReturnReplies(message: unknown): Promise<unknown> {
    const reply: Payload = {
      walletVersion: WALLET_VERSION,
      signedStates: [],
      objectives: [],
    };

    const {
      channelResult,
      outbox: [maybeSyncStateResponse],
    } = await this.time('push update', async () => this.engine.pushUpdate(message));

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
          return this.engine.joinChannels([channelResult.channelId]);
        } else {
          return this.engine.updateChannel(channelResult);
        }
      });

      const engineResponse = messageToSendToPayer.params.data as Payload;

      reply.signedStates = reply.signedStates?.concat(engineResponse.signedStates || []);
      reply.objectives = reply.objectives?.concat(engineResponse.objectives || []);
    }

    return reply;
  }
}
