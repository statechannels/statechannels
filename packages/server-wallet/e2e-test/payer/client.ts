import axios from 'axios';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet, constants} from 'ethers';
const {AddressZero} = constants;
import {makeDestination, BN, Address, Destination, makeAddress} from '@statechannels/wallet-core';

import {Wallet as ServerWallet} from '../../src';
import {Bytes32} from '../../src/type-aliases';
import {recordFunctionMetrics, timerFactory} from '../../src/metrics';
import {payerConfig} from '../e2e-utils';
import {defaultConfig, ServerWalletConfig} from '../../src/config';

export default class PayerClient {
  private readonly wallet: ServerWallet;
  constructor(
    private readonly pk: Bytes32,
    private readonly receiverHttpServerURL: string,
    readonly config?: ServerWalletConfig
  ) {
    this.wallet = recordFunctionMetrics(
      ServerWallet.create(this.config || payerConfig),
      payerConfig.metricsConfiguration.timingMetrics
    );
  }
  public async warmup(): Promise<void> {
    await this.wallet.warmUpThreads();
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
    const {
      outbox: [{params}],
      channelResults: [{channelId}],
    } = await this.wallet.createChannels(
      {
        appData: '0x',
        appDefinition: AddressZero,
        fundingStrategy: 'Direct',
        participants: [this.me, receiver],
        allocations: [
          {
            assetHolderAddress: AddressZero,
            allocationItems: [
              {
                amount: BN.from(0),
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

    const postfund1 = await this.wallet.pushMessage(prefund2);
    const postfund2 = await this.messageReceiverAndExpectReply(postfund1.outbox[0].params.data);
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
      this.messageReceiverAndExpectReply(payload)
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

  public async messageReceiverAndExpectReply(message: unknown): Promise<unknown> {
    const {data: reply} = await axios.post(this.receiverHttpServerURL + '/inbox', {message});
    return reply;
  }
}
