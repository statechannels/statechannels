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
import {Bytes32} from '../type-aliases';
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

    let attemptAnotherProtocolStep = true;

    while (attemptAnotherProtocolStep) {
      await this.store.lockApp(channelToLock, async tx => {
        const protocolState = await this.getCloseChannelProtocolState(
          this.store,
          objective.data.targetChannelId,
          tx
        );
        try {
          let turnNum;
          if (!ensureAllAllocationItemsAreExternalDestinations(protocolState)) {
            attemptAnotherProtocolStep = false;
          } else if ((turnNum = turnNumberToSign(protocolState))) {
            await this.signState(protocolState, turnNum, tx, response);
          } else if (shouldDefund(protocolState)) {
            await this.defund(protocolState, tx);
          } else if (shouldCompleteObjective(protocolState)) {
            attemptAnotherProtocolStep = false;
            await this.completeObjective(objective, protocolState, tx, response);
          } else {
            response.queueChannelState(protocolState.app);
            attemptAnotherProtocolStep = false;
          }
        } catch (error) {
          this.logger.error({error}, 'Error taking a protocol step');
          await tx.rollback(error);
          attemptAnotherProtocolStep = false;
        }
      });
    }
  }

  private async signState(
    protocolState: ProtocolState,
    turnNum: number,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    if (!protocolState.app.supported) {
      throw new Error('Must have a supported state');
    }
    const {myIndex, channelId} = protocolState.app;
    const channel = await Channel.forId(channelId, tx);
    const vars: StateVariables = {...protocolState.app.supported, turnNum, isFinal: true};
    const signedState = await this.store.signState(channel, vars, tx);
    response.queueState(signedState, myIndex, channelId);
  }

  private async defund(protocolState: ProtocolState, tx: Transaction): Promise<void> {
    switch (protocolState.app.fundingStrategy) {
      case 'Direct':
        await this.withdraw(protocolState, tx);
        break;
      case 'Ledger':
        await this.requestLedgerDefunding(protocolState, tx);
        break;
      case 'Fake':
      case 'Unknown':
      case 'Virtual':
        throw new Error(
          `Defunding is not implemented for strategy ${protocolState.app.fundingStrategy}`
        );
      default:
        unreachable(protocolState.app.fundingStrategy);
    }
  }

  private async withdraw(protocolState: ProtocolState, tx: Transaction): Promise<void> {
    await ChainServiceRequest.insertOrUpdate(protocolState.app.channelId, 'withdraw', tx);

    // app.supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
    // Note, we are not awaiting transaction submission
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.chainService.concludeAndWithdraw([protocolState.app.supported!]);
  }

  private async requestLedgerDefunding(
    protocolState: ProtocolState,
    tx: Transaction
  ): Promise<void> {
    await LedgerRequest.requestLedgerDefunding(
      protocolState.app.channelId,
      protocolState.app.fundingLedgerChannelId as string,
      tx
    );
  }

  private async completeObjective(
    objective: DBCloseChannelObjective,
    protocolState: ProtocolState,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    await this.store.markObjectiveStatus(objective, 'succeeded', tx);
    response.queueChannelState(protocolState.app);
    response.queueSucceededObjective(objective);
  }

  /**
   * Helper method to retrieve scoped data needed for CloseChannel protocol.
   */
  private async getCloseChannelProtocolState(
    store: Store,
    channelId: Bytes32,
    tx: Transaction
  ): Promise<ProtocolState> {
    const app = await store.getChannelState(channelId, tx);
    switch (app.fundingStrategy) {
      case 'Direct':
      case 'Fake':
        return {app};
      case 'Ledger': {
        const req = await store.getLedgerRequest(app.channelId, 'defund', tx);
        return {
          app,
          ledgerDefundingRequested: !!req,
          ledgerDefundingSucceeded: req ? req.status === 'succeeded' : false,
          ledgerChannelId: req ? req.ledgerChannelId : undefined,
        };
      }
      case 'Unknown':
      case 'Virtual':
      default:
        throw new Error('getCloseChannelProtocolState: Unimplemented funding strategy');
    }
  }
}

export type ProtocolState = {
  app: ChannelState;
  ledgerDefundingRequested?: boolean;
  ledgerDefundingSucceeded?: boolean;
  ledgerChannelId?: Bytes32;
};

// Pure, synchronous functions START
// =================================

// I want to sign the final state if:
// - I haven't yet signed a final state
// - and either
//    - there's an existing final state (in which case I double sign)
//    - or it's my turn (in which case I craft the final state)
//
function turnNumberToSign(ps: ProtocolState): number | null {
  if (!ps.app.supported || !ps.app.latestSignedByMe || ps.app.latestSignedByMe.isFinal) {
    return null;
  }

  // if there's an existing final state double-sign it
  if (ps.app.supported.isFinal) {
    return ps.app.supported.turnNum;
  }
  // otherwise, if it's my turn, sign a final state
  if (isMyTurn(ps)) {
    return ps.app.supported.turnNum + 1;
  }

  return null;
}

function shouldDefund(ps: ProtocolState): boolean {
  if (!everyoneSignedFinalState(ps.app)) return false;
  switch (ps.app.fundingStrategy) {
    case 'Direct':
      return !ps.app.chainServiceRequests.find(csr => csr.request === 'withdraw')?.isValid();
    case 'Ledger':
      return !ps.ledgerDefundingRequested && !ps.ledgerDefundingSucceeded && !!ps.app.supported;
    case 'Unknown':
    case 'Fake':
      return false;
    case 'Virtual':
      throw new Error('Virtual channel defunding is not implemented');
    default:
      unreachable(ps.app.fundingStrategy);
  }
}

function shouldCompleteObjective(ps: ProtocolState): boolean {
  return (
    everyoneSignedFinalState(ps.app) &&
    ((isLedgerFunded(ps.app) && ps.ledgerDefundingSucceeded) || !isLedgerFunded(ps.app)) &&
    successfulWithdraw(ps)
  );
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
function successfulWithdraw({app}: ProtocolState): boolean {
  if (app.fundingStrategy !== 'Direct') return true;
  return app.directFundingStatus === 'Defunded';
}

const isMyTurn = (ps: ProtocolState): boolean =>
  !!ps.app.supported &&
  (ps.app.supported.turnNum + 1) % ps.app.participants.length === ps.app.myIndex;

/**
 * Ensure none of its allocation items are other channels being funded by this channel
 * (e.g., if it is a ledger channel). This should cause the protocol to "pause" / "freeze"
 * until no channel depends on this channel for funding.
 */
const ensureAllAllocationItemsAreExternalDestinations = (ps: ProtocolState): boolean =>
  !!ps.app.supported &&
  checkThat(ps.app.supported.outcome, isSimpleAllocation).allocationItems.every(({destination}) =>
    isExternalDestination(destination)
  );

const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

// ==============================
// Pure, synchronous functions END
