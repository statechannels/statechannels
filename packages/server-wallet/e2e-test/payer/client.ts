import axios from 'axios';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet, constants, providers} from 'ethers';
const {AddressZero} = constants;
import {makeDestination, BN, Address, Destination, makeAddress} from '@statechannels/wallet-core';
import _ from 'lodash';

import {SingleChannelOutput, Wallet as ServerWallet} from '../../src';
import {Bytes32} from '../../src/type-aliases';
import {recordFunctionMetrics, timerFactory} from '../../src/metrics';
import {payerConfig} from '../e2e-utils';
import {defaultConfig, ServerWalletConfig} from '../../src/config';
import {ONE_DAY} from '../../src/__test__/test-helpers';

// eslint-disable-next-line no-process-env
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const ETH_ASSET_HOLDER_ADDRESS = makeAddress(
  // eslint-disable-next-line no-process-env
  process.env.ETH_ASSET_HOLDER_ADDRESS || constants.AddressZero
);

export default class PayerClient {
  readonly config: ServerWalletConfig;
  readonly provider: providers.JsonRpcProvider;
  private constructor(
    private readonly pk: Bytes32,
    private readonly receiverHttpServerURL: string,
    private readonly wallet: ServerWallet
  ) {
    this.config = wallet.walletConfig;
    this.provider = new providers.JsonRpcProvider(RPC_ENDPOINT);
  }
  public static async create(
    pk: Bytes32,
    receiverHttpServerURL: string,
    config?: ServerWalletConfig
  ): Promise<PayerClient> {
    const mergedConfig = _.assign(payerConfig, config);
    const wallet = recordFunctionMetrics(
      await ServerWallet.create(mergedConfig),
      payerConfig.metricsConfiguration.timingMetrics
    );
    return new PayerClient(pk, receiverHttpServerURL, wallet);
  }

  public async warmup(): Promise<void> {
    await this.wallet.warmUpThreads();
  }

  private async mineBlocks(confirmations = 5) {
    for (const _i in _.range(confirmations)) {
      await this.provider.send('evm_mine', []);
    }
  }
  public async destroy(): Promise<void> {
    await this.wallet.destroy();
  }
  private time = timerFactory(defaultConfig.metricsConfiguration.timingMetrics, 'payerClient');

  public readonly participantId = 'payer';

  public get address(): Address {
    return makeAddress(new Wallet(this.pk).address);
  }

  public get destination(): Destination {
    return makeDestination(this.address);
  }

  public get me(): Participant {
    const {address: signingAddress, destination, participantId} = this;
    return {
      signingAddress,
      destination,
      participantId,
    };
  }

  public async getReceiversParticipantInfo(): Promise<Participant> {
    const {data: participant} = await axios.get<Participant>(
      `${this.receiverHttpServerURL}/participant`
    );
    return participant;
  }

  public async getChannel(channelId: string): Promise<ChannelResult> {
    const {channelResult: channel} = await this.wallet.getState({channelId});

    return channel;
  }

  public async getChannels(): Promise<ChannelResult[]> {
    const {channelResults} = await this.wallet.getChannels();
    return channelResults;
  }

  public async createPayerChannel(receiver: Participant): Promise<ChannelResult> {
    this.wallet.on('channelUpdated', (o: SingleChannelOutput) =>
      this.wallet.logger.trace({event: o}, 'Channel Updated event')
    );

    // We use some arbitrary non-zero amount to force a deposit to happen
    const payerAmount = BN.from(1000);

    const {
      outbox: [{params}],
      channelResults: [{channelId}],
    } = await this.wallet.createChannels(
      {
        appData: '0x',
        appDefinition: AddressZero,
        fundingStrategy: 'Direct',
        challengeDuration: ONE_DAY,
        participants: [this.me, receiver],
        allocations: [
          {
            assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
            allocationItems: [
              {
                amount: payerAmount,
                destination: this.destination,
              },
              {amount: BN.from(0), destination: receiver.destination},
            ],
          },
        ],
      },
      1
    );

    const prefund2 = await this.messageReceiverAndExpectReply(params.data);

    const prefund2Response = await this.wallet.pushMessage(prefund2);

    // This promise resolves when there is something in the outbox to send
    // Either from the prefund2Response or from a channel updated event
    const waitForMessageToSend = new Promise<unknown>(resolve => {
      if (prefund2Response.outbox.length > 0) {
        resolve(prefund2Response.outbox[0].params.data);
      }
      this.wallet.on('channelUpdated', (o: SingleChannelOutput) => {
        if (o.outbox.length > 0) resolve(o.outbox[0].params.data);
      });
    });

    await this.mineBlocks(10);
    const message = await waitForMessageToSend;
    const postfund2 = await this.messageReceiverAndExpectReply(message);
    await this.wallet.pushMessage(postfund2);

    const {channelResult} = await this.wallet.getState({channelId});

    return channelResult;
  }

  public async createPayment(channelId: string): Promise<unknown> {
    const channel = await this.time(`get channel ${channelId}`, async () =>
      this.getChannel(channelId)
    );

    // Assuming MessageQueued inside the outbox
    const {
      outbox: [msgQueued],
    } = await this.time(`update ${channelId}`, async () => this.wallet.updateChannel(channel));

    return msgQueued.params.data;
  }

  public async makePayment(channelId: string): Promise<void> {
    const payload = await this.createPayment(channelId);

    const reply = await this.time(`send message ${channelId}`, async () =>
      this.messageReceiverAndExpectReply(payload, '/payment')
    );

    await this.time(`push message ${channelId}`, async () => this.wallet.pushMessage(reply));
  }

  public async syncChannel(channelId: string): Promise<void> {
    const {
      outbox: [{params}],
    } = await this.wallet.syncChannel({channelId});
    const reply = await this.messageReceiverAndExpectReply(params.data);
    await this.wallet.pushMessage(reply);
  }

  public emptyMessage(): Promise<unknown> {
    return this.messageReceiverAndExpectReply({
      walletVersion: '',
      signedStates: [],
      objectives: [],
    });
  }

  public async messageReceiverAndExpectReply(
    message: unknown,
    endpoint: '/payment' | '/inbox' = '/inbox'
  ): Promise<unknown> {
    const {data: reply} = await axios.post(this.receiverHttpServerURL + endpoint, {message});
    return reply;
  }
}
