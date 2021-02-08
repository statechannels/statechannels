import {
  checkThat,
  CloseChannel,
  isSimpleAllocation,
  StateVariables,
  unreachable,
} from '@statechannels/wallet-core';
import {Transaction} from 'knex';
import {Logger} from 'pino';
import {isExternalDestination} from '@statechannels/nitro-protocol';

import {Store} from '../wallet/store';
import {ChainServiceInterface} from '../chain-service';
import {WalletResponse} from '../wallet/wallet-response';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceRequest} from '../models/chain-service-request';

export class ChannelCloser {
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
  ): ChannelCloser {
    return new ChannelCloser(store, chainService, logger, timingMetrics);
  }

  public async crank(objective: CloseChannel, response: WalletResponse): Promise<void> {
    const channelToLock = objective.data.targetChannelId;

    await this.store.lockApp(channelToLock, async (tx, channel) => {
      if (!channel) {
        throw new Error('Channel must exist');
      }

      await channel.$fetchGraph('funding', {transaction: tx});
      await channel.$fetchGraph('chainServiceRequests', {transaction: tx});

      try {
        if (!ensureAllAllocationItemsAreExternalDestinations(channel)) {
          response.queueChannel(channel);
          return;
        }

        if (!(await this.areAllFinalStatesSigned(channel, tx, response))) {
          response.queueChannel(channel);
          return;
        }

        if (!(await this.isChannelDefunded(channel, tx))) {
          response.queueChannel(channel);
          return;
        }

        await this.completeObjective(objective, channel, tx, response);
      } catch (error) {
        this.logger.error({error}, 'Error taking a protocol step');
        await tx.rollback(error);
      }
    });
  }

  private async areAllFinalStatesSigned(
    channel: Channel,
    tx: Transaction,
    response: WalletResponse
  ): Promise<boolean> {
    // I want to sign the final state if:
    // - I haven't yet signed a final state
    // - and either
    //    - there's an existing final state (in which case I double sign)
    //    - or it's my turn (in which case I craft the final state)

    const {latestSignedByMe, supported, support} = channel;
    if (channel.hasConclusionProof) return true;
    if (!latestSignedByMe || !supported || !support.length) return false;

    if (channel.myTurn) {
      // I am the first to sign a final state
      if (!supported.isFinal) {
        await this.signState(channel, supported.turnNum + 1, tx, response);
        return false;
      }
      await this.signState(channel, supported.turnNum, tx, response);
      return channel.hasConclusionProof;
    }
    return false;
  }

  private async isChannelDefunded(c: Channel, tx: Transaction): Promise<boolean> {
    const {protocolState: ps} = c;

    switch (ps.fundingStrategy) {
      case 'Direct':
        if (c.protocolState.directFundingStatus === 'Defunded') {
          return true;
        }
        if (!c.chainServiceRequests.find(csr => csr.request === 'withdraw')?.isValid()) {
          await this.withdraw(c, tx);
        }
        return false;
      case 'Ledger': {
        const ledgerRequest = await this.store.getLedgerRequest(c.channelId, 'defund', tx);
        if (ledgerRequest && ledgerRequest.status === 'succeeded') {
          return true;
        }
        if (!ledgerRequest || ledgerRequest.status !== 'pending') {
          await this.requestLedgerDefunding(c, tx);
        }
        return false;
      }
      case 'Unknown':
      case 'Fake':
        return true;
      case 'Virtual':
        throw new Error('Virtual channel defunding is not implemented');
      default:
        unreachable(ps.fundingStrategy);
    }
  }

  private async signState(
    channel: Channel,
    turnNum: number,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    if (!channel.supported) {
      throw new Error('Must have a supported state');
    }
    const {myIndex, channelId} = channel;

    const vars: StateVariables = {...channel.supported, turnNum, isFinal: true};
    const signedState = await this.store.signState(channel, vars, tx);
    response.queueState(signedState, myIndex, channelId);
  }

  private async withdraw(channel: Channel, tx: Transaction): Promise<void> {
    await ChainServiceRequest.insertOrUpdate(channel.channelId, 'withdraw', tx);

    // supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
    // Note, we are not awaiting transaction submission
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.chainService.concludeAndWithdraw([channel.supported!]);
  }

  private async requestLedgerDefunding(channel: Channel, tx: Transaction): Promise<void> {
    await LedgerRequest.requestLedgerDefunding(
      channel.channelId,
      channel.fundingLedgerChannelId,
      tx
    );
  }

  private async completeObjective(
    objective: CloseChannel,
    channel: Channel,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    objective = await this.store.markObjectiveStatus(objective, 'succeeded', tx);
    response.queueChannel(channel);
    response.queueSucceededObjective(objective);
  }
}

// Pure, synchronous functions START
// =================================

/**
 * Ensure none of its allocation items are other channels being funded by this channel
 * (e.g., if it is a ledger channel). This should cause the protocol to "pause" / "freeze"
 * until no channel depends on this channel for funding.
 */
const ensureAllAllocationItemsAreExternalDestinations = ({protocolState: ps}: Channel): boolean =>
  !!ps.supported &&
  checkThat(ps.supported.outcome, isSimpleAllocation).allocationItems.every(({destination}) =>
    isExternalDestination(destination)
  );

// ==============================
// Pure, synchronous functions END
