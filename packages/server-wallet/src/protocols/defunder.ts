import {BN, isCloseChannel, unreachable} from '@statechannels/wallet-core';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {AdjudicatorStatusModel} from '../models/adjudicator-status';
import {ChainServiceRequest} from '../models/chain-service-request';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {DBCloseChannelObjective, DBDefundChannelObjective} from '../models/objective';
import {Store} from '../wallet/store';

/**
 * DefunderResult type is the return value of the crank method. The return value of the crank method
 * should be a boolean in the medium/long term.
 *
 * Why is that?
 * The boolean will represent whether the Defunder protocol has reached the terminal point.
 * This is the pattern established by the ChannelOpener protocol. The caller of the Defunder
 * protocol should not be concerned with internal details of whether a transaction is submitted.
 *
 * What about didSubmitTransaction?
 * In the short term, the ChannelDefunder protocol (which invoked the Defunder protocol) completes
 * upon transaction submission. ChannelDefunder protocol will not be used in the medium term.
 * Most likely, a ChallengeAndWithdraw protocol (which invokes this Defunder protocol) will
 * make the ChannelDefunder protocol aboslete.
 */
export type DefunderResult = {isChannelDefunded: boolean; didSubmitTransaction: boolean};
type Objective = DBCloseChannelObjective | DBDefundChannelObjective;

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

  public async crank(
    channel: Channel,
    objective: Objective,
    tx: Transaction
  ): Promise<DefunderResult> {
    const {protocolState: ps} = channel;
    await channel.$fetchGraph('funding', {transaction: tx});
    await channel.$fetchGraph('chainServiceRequests', {transaction: tx});

    switch (ps.fundingStrategy) {
      case 'Direct':
        return this.directDefunder(channel, objective, tx);
      case 'Ledger':
        return this.ledgerDefunder(channel, objective, tx);
      case 'Unknown':
      case 'Fake':
        return {isChannelDefunded: true, didSubmitTransaction: false};
      case 'Virtual':
        throw new Error('Virtual channel defunding is not implemented');
      default:
        unreachable(ps.fundingStrategy);
    }
  }

  private async directDefunder(
    channel: Channel,
    objective: Objective,
    tx: Transaction
  ): Promise<DefunderResult> {
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
    const shouldSubmitTx = shouldSubmitCollaborativeTx(channel, objective);

    /**
     * The below if/else does not account for the following scenario:
     * - Channel is finalized.
     * - Outcomes have been pushed to AssetHolders.
     * - Transfer needs to be called on each AssetHolder
     */
    if (
      adjudicatorStatus.channelMode !== 'Finalized' &&
      channel.hasConclusionProof &&
      shouldSubmitTx
    ) {
      await ChainServiceRequest.insertOrUpdate(channel.channelId, 'withdraw', tx);

      // supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
      if (!channel.supported) {
        throw new Error('channel.supported should be defined in directDefunder');
      }
      // Note, we are not awaiting transaction submission
      await this.chainService.concludeAndWithdraw([channel.supported]);
      didSubmitTransaction = true;
    } else if (adjudicatorStatus.channelMode === 'Finalized' && shouldSubmitTx) {
      await ChainServiceRequest.insertOrUpdate(channel.channelId, 'pushOutcome', tx);
      await this.chainService.pushOutcomeAndWithdraw(
        adjudicatorStatus.states[0],
        // TODO: we are assuming that we submitted the challenge.
        // This is not a valid assumption as the defunder protocol can be run no matter how the channel was finalized
        channel.myAddress
      );
      didSubmitTransaction = true;
    }

    return {isChannelDefunded: false, didSubmitTransaction};
  }

  private async ledgerDefunder(
    channel: Channel,
    objective: Objective,
    tx: Transaction
  ): Promise<DefunderResult> {
    const didSubmitTransaction = false;
    if (!channel.hasConclusionProof) {
      return {isChannelDefunded: false, didSubmitTransaction};
    }
    const ledgerRequest = await this.store.getLedgerRequest(channel.channelId, 'defund', tx);
    if (ledgerRequest && ledgerRequest.status === 'succeeded') {
      return {isChannelDefunded: true, didSubmitTransaction};
    }
    if (!ledgerRequest || ledgerRequest.status !== 'pending') {
      await this.requestLedgerDefunding(channel, tx);
    }
    return {isChannelDefunded: false, didSubmitTransaction};
  }

  private async requestLedgerDefunding(channel: Channel, tx: Transaction): Promise<void> {
    await LedgerRequest.requestLedgerDefunding(
      channel.channelId,
      channel.fundingLedgerChannelId,
      tx
    );
  }
}

/**
 * Assume that we are going to submit collaborative transaction(s) unless:
 * 1. There is an agreed upon order of transaction submitters.
 * 2. There is a transaction submitter before us who has funds in the channel.
 */
export function shouldSubmitCollaborativeTx(channel: Channel, objective: Objective): boolean {
  let shouldSubmitCollaborativeTx = true;
  /**
   * Only CloseChannel objective specifies the transaction submitter order.
   * The DefundChannel objective will be soon replaced with the ChallengeChannel objective.
   * Challenge channel objective does not result in any collaborative transactions.
   */
  if (isCloseChannel(objective)) {
    for (const txSubmitter of objective.data.txSubmitterOrder) {
      const allocation = channel.allocationItemForParticipantIndex(txSubmitter);
      if (allocation && BN.gt(allocation.amount, 0)) {
        shouldSubmitCollaborativeTx = txSubmitter === channel.myIndex;
        break;
      }
    }
  }
  return shouldSubmitCollaborativeTx;
}
