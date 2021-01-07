import {Address, BN, checkThat, isSimpleAllocation, Uint256} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {ChainServiceRequest} from '../models/chain-service-request';
import {Channel} from '../models/channel';
import {DBOpenChannelObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';

export class DirectFunder {
  constructor(
    private store: Store,
    private chainService: ChainServiceInterface,
    private logger: Logger,
    private timingMetrics = false
  ) {}

  public static create(
    store: Store,
    chainService: ChainServiceInterface,
    logger: Logger,
    timingMetrics = false
  ): DirectFunder {
    return new DirectFunder(store, chainService, logger, timingMetrics);
  }

  /**
   * Runs the ledger funding protocol
   *
   * Returns true if the channel is funded, false otherwise
   */
  public async crank(
    objective: DBOpenChannelObjective,
    channel: Channel,
    response: WalletResponse,
    tx: Transaction
  ): Promise<boolean> {
    const assetHolderAddress = this.assetHolder(channel);
    const [targetBefore, targetAfter, targetTotal] = this.fundingMilestones(channel);

    const currentFunding = await this.store.getFunding(channel.channelId, assetHolderAddress, tx);
    const currentAmount = currentFunding?.amount || 0;

    // if we're fully funded, we're done
    if (BN.gte(currentAmount, targetTotal)) return true;

    // if it isn't my turn yet, take no action
    if (BN.lt(currentAmount, targetBefore)) return false;

    // if my deposit is already on chain, take no action
    if (BN.gte(currentAmount, targetAfter)) return false;

    // if there's an outstanding chain request, take no action
    if (await this.store.fundingRequestExists(channel.channelId, tx)) return false;

    // otherwise, deposit
    const amountToDeposit = BN.sub(targetAfter, currentAmount); // previous checks imply this is >0
    await ChainServiceRequest.insertOrUpdate(channel.channelId, 'fund', tx);
    await this.chainService.fundChannel({
      channelId: channel.channelId,
      assetHolderAddress: assetHolderAddress,
      expectedHeld: BN.from(currentAmount),
      amount: BN.from(amountToDeposit),
    });

    return false;
  }

  private assetHolder(channel: Channel): Address {
    const supported = channel.supported;
    if (!supported) {
      throw new Error(`Channel passed to DirectFunder has no supported state`);
    }

    const {assetHolderAddress} = checkThat(supported?.outcome, isSimpleAllocation);

    return assetHolderAddress;
  }

  /**
   * Returns a triple of balance [targetBefore, targetAfter, targetTotal], where
   *  - targetBefore is the balance where I should start depositing
   *  - targetAfter should be the balance where I stop depositing
   *  - targetTotal is the total amount that should be in the channel
   *
   * @param channel
   */
  private fundingMilestones(channel: Channel): [Uint256, Uint256, Uint256] {
    /**
     * The below logic assumes:
     *  1. Each destination occurs at most once.
     *  2. We only care about a single destination.
     * One reason to drop (2), for instance, is to support ledger top-ups with as few state updates as possible.
     */
    const supported = channel.supported;
    if (!supported) {
      throw new Error(`Channel passed to DriectFunder has no supported state`);
    }

    const myDestination = channel.participants[channel.myIndex].destination;
    const {allocationItems} = checkThat(supported.outcome, isSimpleAllocation);

    const myAllocationItem = _.find(allocationItems, ai => ai.destination === myDestination);
    if (!myAllocationItem) {
      throw new Error(`My destination ${myDestination} is not in allocations ${allocationItems}`);
    }

    const allocationsBefore = _.takeWhile(allocationItems, a => a.destination !== myDestination);
    const targetBefore = allocationsBefore.map(a => a.amount).reduce(BN.add, BN.from(0));

    const targetAfter = BN.add(targetBefore, myAllocationItem.amount);

    const total = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));

    return [targetBefore, targetAfter, total];
  }
}
