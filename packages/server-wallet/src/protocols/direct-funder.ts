import {BN, checkThat, isSimpleAllocation} from '@statechannels/wallet-core';
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
    // don't check channel state - that should already have happened
    // check funding state

    if (channel.protocolState.directFundingStatus === 'Funded') {
      return true;
    }

    // request fund channel if my turn
    await this.requestFundChannelIfMyTurn(channel, tx);

    return false;
  }

  private async requestFundChannelIfMyTurn(channel: Channel, tx: Transaction): Promise<void> {
    const app = channel.protocolState;
    /**
     * The below logic assumes:
     *  1. Each destination occurs at most once.
     *  2. We only care about a single destination.
     * One reason to drop (2), for instance, is to support ledger top-ups with as few state updates as possible.
     */

    if (!app.supported) return;

    const existingRequest = app.chainServiceRequests.find(csr => csr.request === 'fund');
    if (existingRequest?.isValid()) return;

    if (app.directFundingStatus !== 'ReadyToFund') return;

    const myDestination = app.participants[app.myIndex].destination;
    const {allocationItems, assetHolderAddress} = checkThat(
      app.supported?.outcome,
      isSimpleAllocation
    );

    const currentFunding = app.funding(assetHolderAddress)?.amount;
    if (!currentFunding) {
      // this is a developer error, so throw
      throw new Error(
        `Funding not loaded from db. Make sure you use .withGraphJoined('funding') when fetching the channel.`
      );
    }

    const allocationsBeforeMe = _.takeWhile(allocationItems, a => a.destination !== myDestination);
    const targetBeforeMyDeposit = allocationsBeforeMe.map(a => a.amount).reduce(BN.add, BN.from(0));
    if (BN.lt(currentFunding, targetBeforeMyDeposit)) return;

    const myAllocationItem = _.find(allocationItems, ai => ai.destination === myDestination);
    if (!myAllocationItem) {
      throw new Error(`My destination ${myDestination} is not in allocations ${allocationItems}`);
    }
    if (BN.eq(myAllocationItem.amount, 0)) return;
    const targetAfterMyDeposit = BN.add(targetBeforeMyDeposit, myAllocationItem.amount);
    if (BN.gte(currentFunding, targetAfterMyDeposit)) return;
    const amountToDeposit = BN.sub(targetAfterMyDeposit, currentFunding); // previous line implies this is >0

    // actions
    await ChainServiceRequest.insertOrUpdate(app.channelId, 'fund', tx);
    await this.chainService.fundChannel({
      channelId: app.channelId,
      assetHolderAddress: assetHolderAddress,
      expectedHeld: BN.from(currentFunding),
      amount: BN.from(amountToDeposit),
    });
  }
}
