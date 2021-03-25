import {BN, checkThat, isSimpleAllocation, OpenChannel} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {WalletObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {EngineResponse} from '../wallet/wallet-response';

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
    objective: WalletObjective<OpenChannel>,
    channel: Channel,
    response: EngineResponse,
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
    await this.requestLedgerFunding(channel, ledger, tx);
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
    channel: Channel,
    ledger: Channel,
    tx: Transaction
  ): Promise<void> {
    const myAmount = channel.myAmount;
    const theirAmount = channel.opponentAmount;
    const [amountA, amountB] =
      ledger.myIndex === 0 ? [myAmount, theirAmount] : [theirAmount, myAmount];

    await LedgerRequest.requestLedgerFunding(
      channel.channelId,
      ledger.channelId,
      amountA,
      amountB,
      tx
    );
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
