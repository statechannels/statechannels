import axios from 'axios';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet, constants} from 'ethers';
const {AddressZero} = constants;
import {makeDestination, BN} from '@statechannels/wallet-core';

import {Wallet as ServerWallet} from '../../src';
import {Bytes32, Address} from '../../src/type-aliases';
import {recordFunctionMetrics, timerFactory} from '../../src/metrics';
import {payerConfig} from '../e2e-utils';
import {defaultConfig} from '../../src/config';

export default class PayerClient {
  private readonly wallet: ServerWallet = recordFunctionMetrics(
    new ServerWallet(payerConfig),
    payerConfig.timingMetrics
  );
  public async destroy(): Promise<void> {
    await this.wallet.destroy();
  }
  private time = timerFactory(defaultConfig.timingMetrics, 'payerClient');
  constructor(private readonly pk: Bytes32, private readonly receiverHttpServerURL: string) {}

  public readonly participantId = 'payer';

  public get address(): Address {
    return new Wallet(this.pk).address;
  }

  public get destination(): Address {
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
      channelResult: {channelId},
    } = await this.wallet.createChannel({
      appData: '0x',
      appDefinition: AddressZero,
      fundingStrategy: 'Direct',
      participants: [this.me, receiver],
      allocations: [
        {
          token: AddressZero,
          allocationItems: [
            {
              amount: BN.from(0),
              destination: this.destination,
            },
            {amount: BN.from(0), destination: receiver.destination},
          ],
        },
      ],
    });

    const reply = await this.messageReceiverAndExpectReply(params.data);

    await this.wallet.pushMessage(reply);

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
      signedStates: [],
      objectives: [],
    });
  }

  public async messageReceiverAndExpectReply(message: unknown): Promise<unknown> {
    const {data: reply} = await axios.post(this.receiverHttpServerURL + '/inbox', {message});
    return reply;
  }
}
