import {
  checkThat,
  isSimpleAllocation,
  StateVariables,
  unreachable,
} from '@statechannels/wallet-core';
import {Transaction} from 'knex';
import {Logger} from 'pino';
import {isExternalDestination} from '@statechannels/nitro-protocol';

import {Store} from '../wallet/store';
import {ChainServiceInterface} from '../chain-service';
import {DBCloseChannelObjective} from '../models/objective';
import {WalletResponse} from '../wallet/wallet-response';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceRequest} from '../models/chain-service-request';

import {ChannelState} from './state';

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

  public async crank(objective: DBCloseChannelObjective, response: WalletResponse): Promise<void> {
    const channelToLock = objective.data.targetChannelId;

    await this.store.lockApp(channelToLock, async (tx, channel) => {
      if (!channel) {
        throw new Error('Channel must exist');
      }
      try {
        if (!ensureAllAllocationItemsAreExternalDestinations(channel)) {
          return;
        }

        const turnNum = turnNumberToSign(channel);
        // Explicitly check undefined just in case we want to sign turnNum 0
        if (turnNum !== undefined) {
          await this.signState(channel, turnNum, tx, response);
        }

        if (await this.shouldDefund(channel, tx)) {
          await this.defund(channel, tx);
        }

        if (await this.shouldCompleteObjective(channel, tx)) {
          await this.completeObjective(objective, channel, tx, response);
          return;
        }

        response.queueChannel(channel);
      } catch (error) {
        this.logger.error({error}, 'Error taking a protocol step');
        await tx.rollback(error);
      }
    });
  }

  private async shouldDefund(c: Channel, tx: Transaction): Promise<boolean> {
    const {protocolState: ps} = c;
    if (!everyoneSignedFinalState(ps)) {
      return false;
    }
    switch (ps.fundingStrategy) {
      case 'Direct':
        await c.$fetchGraph('chainServiceRequests', {transaction: tx});
        return !c.chainServiceRequests.find(csr => csr.request === 'withdraw')?.isValid();
      case 'Ledger': {
        const ledgerRequest = await this.store.getLedgerRequest(c.channelId, 'defund', tx);
        return !!ps.supported && (!ledgerRequest || ledgerRequest.status === 'succeeded');
      }
      case 'Unknown':
      case 'Fake':
        return false;
      case 'Virtual':
        throw new Error('Virtual channel defunding is not implemented');
      default:
        unreachable(ps.fundingStrategy);
    }
  }

  private async shouldCompleteObjective(channel: Channel, tx: Transaction): Promise<boolean> {
    const ledgerRequest = await this.store.getLedgerRequest(channel.channelId, 'defund', tx);
    const {protocolState: ps} = channel;

    return (
      everyoneSignedFinalState(ps) &&
      ((isLedgerFunded(ps) && ledgerRequest?.status === 'succeeded') || !isLedgerFunded(ps)) &&
      successfulWithdraw(channel)
    );
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

  private async defund(channel: Channel, tx: Transaction): Promise<void> {
    const {protocolState} = channel;
    switch (protocolState.fundingStrategy) {
      case 'Direct':
        await this.withdraw(channel, tx);
        break;
      case 'Ledger':
        await this.requestLedgerDefunding(channel, tx);
        break;
      case 'Fake':
      case 'Unknown':
      case 'Virtual':
        throw new Error(
          `Defunding is not implemented for strategy ${protocolState.fundingStrategy}`
        );
      default:
        unreachable(protocolState.fundingStrategy);
    }
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
    objective: DBCloseChannelObjective,
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

// I want to sign the final state if:
// - I haven't yet signed a final state
// - and either
//    - there's an existing final state (in which case I double sign)
//    - or it's my turn (in which case I craft the final state)
//
function turnNumberToSign({protocolState: ps}: Channel): number | undefined {
  if (!ps.supported || !ps.latestSignedByMe || ps.latestSignedByMe.isFinal) {
    return undefined;
  }

  // if there's an existing final state double-sign it
  if (ps.supported.isFinal) {
    return ps.supported.turnNum;
  }
  // otherwise, if it's my turn, sign a final state
  if (isMyTurn(ps)) {
    return ps.supported.turnNum + 1;
  }

  return undefined;
}

function everyoneSignedFinalState({latestSignedByMe, support, supported}: ChannelState): boolean {
  return (
    !!latestSignedByMe &&
    !!supported &&
    latestSignedByMe.isFinal &&
    supported.isFinal &&
    (support || []).every(s => s.isFinal)
  );
}

// TODO: where is the corresponding logic for ledger channels?
//       should there be a generic logic for computing whether a channel is defunded regardless of funding type?
function successfulWithdraw(channel: Channel): boolean {
  if (channel.fundingStrategy !== 'Direct') return true;
  return channel.protocolState.directFundingStatus === 'Defunded';
}

const isMyTurn = (ps: ChannelState): boolean =>
  !!ps.supported && (ps.supported.turnNum + 1) % ps.participants.length === ps.myIndex;

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

const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

// ==============================
// Pure, synchronous functions END
