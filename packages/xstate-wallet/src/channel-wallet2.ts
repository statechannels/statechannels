import {
  BN,
  calculateChannelId,
  checkThat,
  isSimpleEthAllocation,
  Objective,
  SignedState,
  Uint256,
  Zero
} from '@statechannels/wallet-core';
import _, {Dictionary} from 'lodash';

import {MessagingService} from './messaging';
import {ChannelWallet} from './channel-wallet';
import {ChannelStoreEntry} from './store/channel-store-entry';
import {logger} from './logger';
import {Store} from './store';
import {ChainWatcher, ChannelChainInfo} from './chain';

export type Message = {
  objectives: Objective[];
  signedStates: SignedState[];
};
type Response = Message & {deposit?: boolean};

type Funding = {amountOnChain: Uint256; status?: 'DEPOSITED'};
type OnNewMessage = (message: Message) => void;

type DepositInfo = {
  depositAt: Uint256;
  myDeposit: Uint256;
  totalAfterDeposit: Uint256;
  fundedAt: Uint256;
};

export class ChannelWallet2 extends ChannelWallet {
  private chain: ChainWatcher;
  private onNewMessage: OnNewMessage;
  private registeredChannels: Set<string>;
  private channelFunding: Dictionary<Funding>;
  private constructor(
    onNewMessage: OnNewMessage,
    chain = new ChainWatcher(),
    store = new Store(chain)
  ) {
    super(store, new MessagingService(store));
    this.chain = chain;

    this.onNewMessage = onNewMessage;
    this.registeredChannels = new Set<string>();
    // TODO: probably should be stored in a more permanent storage
    this.channelFunding = {};
  }

  private async init(): Promise<ChannelWallet2> {
    await this.store.initialize();
    return this;
  }

  static async create(onNewMessage: OnNewMessage): Promise<ChannelWallet2> {
    return new ChannelWallet2(onNewMessage).init();
  }

  public getAddress(): Promise<string> {
    return this.store.getAddress();
  }

  async incomingMessage(payload: Message): Promise<Message> {
    let response: Message = {
      objectives: [],
      signedStates: []
    };
    // Store any new objectives
    const payloadObjective = payload.objectives?.[0];
    if (!payloadObjective) {
      logger.info('No incoming objectives');
    } else {
      await this.store.addObjective(payloadObjective);
    }

    // Store any new states
    const payloadState = payload.signedStates?.[0];
    if (!payloadState) {
      logger.info('No incoming states');
    } else {
      await this.store.addState(payloadState);
      const channelId = calculateChannelId(payloadState);
      if (!this.registeredChannels.has(channelId)) {
        this.chain.chainUpdatedFeed(channelId).subscribe({
          next: chainInfo => this.onFundingUpdate(channelId, chainInfo)
        });
      }
    }

    // Crank objectives
    for (const objective of this.store.objectives) {
      switch (objective.type) {
        case 'OpenChannel': {
          response = await this.onOpenChannelObjective(objective.data.targetChannelId);
          break;
        }
        default:
          throw new Error('Objective not supported');
      }
    }
    return response;
  }

  async onOpenChannelObjective(channelId: string): Promise<Message> {
    const channel = await this.store.getEntry(channelId);
    const pk = await this.store.getPrivateKey(await this.store.getAddress());
    const depositInfo = await this.getDepositInfo(channelId);

    const response = this.crankOpenChannelObjective(
      channel,
      this.channelFunding[channelId],
      depositInfo,
      pk
    );
    if (response.deposit) {
      this.channelFunding[channelId] = {...this.channelFunding[channelId], status: 'DEPOSITED'};
      await this.chain.deposit(
        channel.channelId,
        this.channelFunding[channelId].amountOnChain,
        depositInfo.myDeposit
      );
    }
    if (response.signedStates[0]) {
      await this.store.addState(response.signedStates[0]);
      this.onNewMessage(response);
    }
    return response;
  }

  crankOpenChannelObjective(
    channel: ChannelStoreEntry,
    channelFunding: Funding,
    depositInfo: DepositInfo,
    pk: string
  ): Response {
    const response: Response = {
      objectives: [],
      signedStates: []
    };
    const {latestState} = channel;
    // Should we sign the prefund state?
    if (latestState.turnNum === 0 && !channel.isSupportedByMe) {
      const newState = channel.signAndAdd(latestState, pk);
      response.signedStates = [newState];
      return response;
    }

    // Should we deposit?
    if (
      BN.gte(channelFunding.amountOnChain, depositInfo.depositAt) &&
      BN.lt(channelFunding.amountOnChain, depositInfo.totalAfterDeposit) &&
      channelFunding.status !== 'DEPOSITED'
    ) {
      response.deposit = true;
      return response;
    }

    // Should we sign the postfund state?
    if (
      BN.gte(channelFunding.amountOnChain, depositInfo.fundedAt) &&
      latestState.turnNum === 3 &&
      channel.latestSignedByMe.turnNum === 0
    ) {
      const newState = channel.signAndAdd(latestState, pk);
      response.signedStates = [newState];
      return response;
    }

    return response;
  }

  async onFundingUpdate(channelId: string, channelChainInfo: ChannelChainInfo): Promise<void> {
    this.channelFunding[channelId] = {
      ...this.channelFunding[channelId],
      amountOnChain: channelChainInfo.amount
    };
    await this.onOpenChannelObjective(channelId);
  }

  async getDepositInfo(channelId: string): Promise<DepositInfo> {
    const {latestState, myIndex} = await this.store.getEntry(channelId);
    const {allocationItems} = checkThat(latestState.outcome, isSimpleEthAllocation);

    const fundedAt = allocationItems.map(a => a.amount).reduce(BN.add);
    let depositAt = Zero;
    for (let i = 0; i < allocationItems.length; i++) {
      const {amount} = allocationItems[i];
      if (i !== myIndex) depositAt = BN.add(depositAt, amount);
      else {
        const totalAfterDeposit = BN.add(depositAt, amount);
        return {depositAt, myDeposit: amount, totalAfterDeposit, fundedAt};
      }
    }

    throw Error(`Could not find an allocation for participant id ${myIndex}`);
  }
}
