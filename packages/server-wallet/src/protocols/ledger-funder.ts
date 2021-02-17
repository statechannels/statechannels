import {BN, checkThat, isSimpleAllocation} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {DBOpenChannelObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';

export class LedgerFunder {
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
  ): LedgerFunder {
    return new LedgerFunder(store, chainService, logger, timingMetrics);
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
    const ledgerId = objective.data.fundingLedgerChannelId;
    // sanity check
    if (!ledgerId) {
      throw new Error(`LedgerFunder called with objective without a fundingLedgerChannelId`);
    }

    const ledger = await this.store.getChannel(ledgerId, tx);
    if (!ledger) return false;

    // are we already funded? if so, return true
    if (await this.alreadyFunded(channel, ledger, tx)) return true;

    // if we already requested funding return false
    if (await this.alreadyRequestedFunding(channel.channelId, tx)) return false;

    // otherwise request funding
    await this.requestLedgerFunding(channel.channelId, ledgerId, tx);
    return false;
  }

  private async alreadyFunded(
    channel: Channel,
    ledger: Channel,
    _tx: Transaction
  ): Promise<boolean> {
    if (!ledger.isRunning) return false;
    return doesLedgerFundApp(ledger, channel);
  }

  private async requestLedgerFunding(
    channelId: string,
    ledgerId: string,
    tx: Transaction
  ): Promise<void> {
    await LedgerRequest.requestLedgerFunding(channelId, ledgerId, tx);
  }

  private async alreadyRequestedFunding(channelId: string, tx: Transaction): Promise<boolean> {
    const req = await this.store.getLedgerRequest(channelId, 'fund', tx);
    return !!req;
  }
}

function doesLedgerFundApp(ledger: Channel, app: Channel): boolean {
  if (!ledger.supported) return false;
  if (!app.supported) return false;

  const {allocationItems: ledgerFunding} = checkThat(ledger.supported.outcome, isSimpleAllocation);
  const {allocationItems: appFunding} = checkThat(app.supported.outcome, isSimpleAllocation);
  const targetFunding = appFunding.map(a => a.amount).reduce(BN.add, BN.from(0));

  return _.some(
    ledgerFunding,
    ({destination, amount}) => destination === app.channelId && amount === targetFunding
  );
}
