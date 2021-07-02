import {Address, BN, checkThat, isSimpleAllocation, OpenChannel} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceRequest} from '../models/chain-service-request';
import {Channel} from '../models/channel';
import {WalletObjective} from '../models/objective';
import {Store} from '../engine/store';
import {EngineResponse} from '../engine/engine-response';

export class DirectFunder {
  constructor(
    private store: Store,

    private logger: Logger,
    private timingMetrics = false
  ) {}

  public static create(
    store: Store,

    logger: Logger,
    timingMetrics = false
  ): DirectFunder {
    return new DirectFunder(store, logger, timingMetrics);
  }

  /**
   * Runs the ledger funding protocol
   *
   * Returns true if the channel is funded, false otherwise
   */
  public async crank(
    objective: WalletObjective<OpenChannel>,
    channel: Channel,
    response: EngineResponse,
    tx: Transaction
  ): Promise<boolean> {
    const assetHolderAddress = this.assetHolder(channel);
    const {targetBefore, targetAfter, targetTotal} = channel.fundingMilestones;

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
    response.queueChainRequest([
      {
        type: 'FundChannel',
        channelId: channel.channelId,
        asset: assetHolderAddress,
        expectedHeld: BN.from(currentAmount),
        amount: BN.from(amountToDeposit),
      },
    ]);

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
}
