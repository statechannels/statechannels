import {checkThat, isSimpleAllocation, StateVariables} from '@statechannels/wallet-core';
import {Transaction} from 'objection';
import {Logger} from 'pino';
import {isExternalDestination} from '@statechannels/nitro-protocol';

import {Store} from '../wallet/store';
import {ChainServiceInterface} from '../chain-service';
import {DBCloseChannelObjective} from '../models/objective';
import {WalletResponse} from '../wallet/wallet-response';
import {Channel} from '../models/channel';
import {Cranker, Nothing} from '../objectives/objective-manager';

import {Defunder} from './defunder';

export const enum WaitingFor {
  allAllocationItemsToBeExternalDestination = 'ChannelCloser.allAllocationItemsToBeExternalDestination',
  theirFinalState = 'ChannelCloser.theirFinalState', // i.e. other participants' final states
  defunding = 'ChannelCloser.defunding',
}

export class ChannelCloser implements Cranker<DBCloseChannelObjective> {
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

  public async crank(
    objective: DBCloseChannelObjective,
    response: WalletResponse,
    tx: Transaction
  ): Promise<WaitingFor | Nothing> {
    const channelToLock = objective.data.targetChannelId;
    const channel = await this.store.getAndLockChannel(channelToLock, tx);

    if (!channel) {
      throw new Error('Channel must exist');
    }

    response.queueChannel(channel);

    await channel.$fetchGraph('funding', {transaction: tx});
    await channel.$fetchGraph('chainServiceRequests', {transaction: tx});

    try {
      if (!ensureAllAllocationItemsAreExternalDestinations(channel)) {
        response.queueChannel(channel);
        return WaitingFor.allAllocationItemsToBeExternalDestination;
      }

      const defunder = Defunder.create(
        this.store,
        this.chainService,
        this.logger,
        this.timingMetrics
      );

      if (!(await this.areAllFinalStatesSigned(channel, tx, response))) {
        response.queueChannel(channel);
        return WaitingFor.theirFinalState;
      }

      if (!(await defunder.crank(channel, tx)).isChannelDefunded) {
        response.queueChannel(channel);
        return WaitingFor.defunding;
      }

      await this.completeObjective(objective, channel, tx, response);
    } catch (error) {
      this.logger.error({error}, 'Error taking a protocol step');
      await tx.rollback(error);
    }
    return Nothing.ToWaitFor;
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
