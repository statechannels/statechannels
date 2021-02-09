import axios from 'axios';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet, constants, providers} from 'ethers';
const {AddressZero} = constants;
import {makeDestination, BN, Address, Destination, makeAddress} from '@statechannels/wallet-core';
import _ from 'lodash';

import {MultiThreadedWallet, Wallet as ServerWallet} from '../../src';
import {Bytes32} from '../../src/type-aliases';
import {recordFunctionMetrics, timerFactory} from '../../src/metrics';
import {payerConfig} from '../e2e-utils';
import {DeepPartial, defaultConfig, ServerWalletConfig} from '../../src/config';
import {ONE_DAY} from '../../src/__test__/test-helpers';
import {WalletEvent} from '../../src/wallet/types';

type TestChannelResult = {
  channelResult: ChannelResult;
  events: WalletEvent[];
};

export default class PayerClient {
  readonly config: ServerWalletConfig;
  readonly provider: providers.JsonRpcProvider;
  private constructor(
    private readonly pk: Bytes32,
    private readonly receiverHttpServerURL: string,
    public readonly wallet: ServerWallet
  ) {
    this.config = wallet.walletConfig;
    this.provider = new providers.JsonRpcProvider(this.config.chainServiceConfiguration.provider);
  }
  public static async create(
    pk: Bytes32,
    receiverHttpServerURL: string,
    partialConfig?: DeepPartial<ServerWalletConfig>
  ): Promise<PayerClient> {
    const mergedConfig = _.merge(payerConfig, partialConfig);
    const wallet = recordFunctionMetrics(
      await ServerWallet.create(mergedConfig),
      payerConfig.metricsConfiguration.timingMetrics
    );
    return new PayerClient(pk, receiverHttpServerURL, wallet);
  }

  public async warmup(): Promise<void> {
    this.wallet instanceof MultiThreadedWallet && (await this.wallet.warmUpThreads());
  }
  public async destroy(): Promise<void> {
    this.provider.removeAllListeners();
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

  public async createPayerChannel(receiver: Participant): Promise<TestChannelResult> {
    const events: WalletEvent[] = [];
    const names = ['channelUpdated', 'objectiveStarted', 'objectiveSucceeded'] as const;
    names.map(event => this.wallet.on(event, e => events.push({...e, event})));

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

    return {channelResult, events};
  }
  /**
   * Mines a block that with a timestamp =  currentBlock.timestamp + timeIncrease
   * This is useful for testing time related functionality
   * @param timeIncrease The amount of time in seconds to add to the current date time
   */
  public async mineFutureBlock(timeIncrease: number): Promise<void> {
    const currentBlock = await this.provider.getBlock(this.provider.getBlockNumber());
    const expectedTimestamp = currentBlock.timestamp + timeIncrease;

    const blockMined = new Promise<void>(resolve => {
      this.provider.on('block', async (blockTag: providers.BlockTag) => {
        const block = await this.provider.getBlock(blockTag);

        if (block.timestamp >= expectedTimestamp) {
          resolve();
        }
      });
    });
    await this.provider.send('evm_increaseTime', [timeIncrease]);
    await this.provider.send('evm_mine', []);

    await blockMined;
  }

  /**
   * Mines the specified amount of blocks.
   * Waits to detect the block events before resolving
   * @param confirmations The amount of blocks to mine
   */
  public async mineBlocks(confirmations = 5): Promise<void> {
    const blocksMined = new Promise<void>(resolve => {
      let counter = confirmations;
      this.provider.on('block', async () => {
        counter = counter - 1;
        if (counter <= 0) {
          resolve();
        }
      });
    });

    for (const _i in _.range(confirmations)) {
      await this.provider.send('evm_mine', []);
    }

    await blocksMined;
  }
  public async challenge(channelId: string): Promise<ChannelResult> {
    const {channelResult} = await this.wallet.challenge(channelId);
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
