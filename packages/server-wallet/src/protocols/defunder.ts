import {unreachable} from '@statechannels/wallet-core';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {AdjudicatorStatusModel} from '../models/adjudicator-status';
import {ChainServiceRequest} from '../models/chain-service-request';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {Store} from '../wallet/store';

export type DefunderResult = {isChannelDefunded: boolean; didSubmitTransaction: boolean};

export class Defunder {
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
  ): Defunder {
    return new Defunder(store, chainService, logger, timingMetrics);
  }

  public async crank(channel: Channel, tx: Transaction): Promise<DefunderResult> {
    const {protocolState: ps} = channel;

    switch (ps.fundingStrategy) {
      case 'Direct':
        return await this.directDefunder(channel, tx);
      case 'Ledger':
        return this.ledgerDefunder(channel, tx);
      case 'Unknown':
      case 'Fake':
        return {isChannelDefunded: true, didSubmitTransaction: false};
      case 'Virtual':
        throw new Error('Virtual channel defunding is not implemented');
      default:
        unreachable(ps.fundingStrategy);
    }
  }

  private async directDefunder(channel: Channel, tx: Transaction): Promise<DefunderResult> {
    if (!channel.isPartlyDirectFunded) {
      return {isChannelDefunded: true, didSubmitTransaction: false};
    }

    const hasValidRequest = ['withdraw', 'pushOutcome']
      .map(requestType =>
        channel.chainServiceRequests.find(csr => csr.request === requestType)?.isValid()
      )
      .some(val => val);
    if (hasValidRequest) return {isChannelDefunded: false, didSubmitTransaction: false};

    const adjudicatorStatus = await AdjudicatorStatusModel.getAdjudicatorStatus(
      tx,
      channel.channelId
    );
    let didSubmitTransaction = false;
    if (adjudicatorStatus.channelMode !== 'Finalized' && channel.hasConclusionProof) {
      await ChainServiceRequest.insertOrUpdate(channel.channelId, 'withdraw', tx);

      // supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
      if (!channel.supported) {
        throw new Error('channel.supported should be defined in directDefunder');
      }
      // Note, we are not awaiting transaction submission
      await this.chainService.concludeAndWithdraw([channel.supported]);
      didSubmitTransaction = true;
    } else if (adjudicatorStatus.channelMode === 'Finalized') {
      await ChainServiceRequest.insertOrUpdate(channel.channelId, 'pushOutcome', tx);
      await this.chainService.pushOutcomeAndWithdraw(
        adjudicatorStatus.states[0],
        channel.myAddress
      );
      didSubmitTransaction = true;
    }

    return {isChannelDefunded: false, didSubmitTransaction};
  }

  private async ledgerDefunder(channel: Channel, tx: Transaction): Promise<DefunderResult> {
    const ledgerRequest = await this.store.getLedgerRequest(channel.channelId, 'defund', tx);
    if (ledgerRequest && ledgerRequest.status === 'succeeded') {
      return {isChannelDefunded: true, didSubmitTransaction: false};
    }
    if (!ledgerRequest || ledgerRequest.status !== 'pending') {
      await this.requestLedgerDefunding(channel, tx);
    }
    return {isChannelDefunded: false, didSubmitTransaction: false};
  }

  private async requestLedgerDefunding(channel: Channel, tx: Transaction): Promise<void> {
    await LedgerRequest.requestLedgerDefunding(
      channel.channelId,
      channel.fundingLedgerChannelId,
      tx
    );
  }
}
