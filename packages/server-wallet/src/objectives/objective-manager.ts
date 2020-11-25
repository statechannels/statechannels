import {Logger} from 'pino';
import {unreachable} from '@statechannels/wallet-core';
import {Transaction} from 'objection';

import {Bytes32} from '../type-aliases';
import {ProtocolState as OpenChannelProtocolState, ChannelOpener} from '../protocols/open-channel';
import {
  getCloseChannelProtocolState,
  ProtocolState as CloseChannelProtocolState,
  protocol as closeChannelProtocol,
} from '../protocols/close-channel';
import {Store} from '../wallet/store';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceInterface} from '../chain-service';
import {SignState, Withdraw} from '../protocols/actions';
import {recordFunctionMetrics} from '../metrics';
import {WalletResponse} from '../wallet/response-builder';
import {Channel} from '../models/channel';
import {DBCloseChannelObjective, DBObjective} from '../models/objective';

import {ObjectiveManagerParams} from './types';
import {CloseChannelObjective} from './close-channel';

type SupportedProtocolState = OpenChannelProtocolState | CloseChannelProtocolState;

export class ObjectiveManager {
  private store: Store;
  private logger: Logger;
  private chainService: ChainServiceInterface;
  private timingMetrics: boolean;

  static create(params: ObjectiveManagerParams): ObjectiveManager {
    return new this(params);
  }

  private constructor({store, logger, chainService, timingMetrics}: ObjectiveManagerParams) {
    this.store = store;
    this.logger = logger;
    this.chainService = chainService;
    this.timingMetrics = timingMetrics;
  }

  /**
   * Attempts to advance the given objective
   *
   * Swallows (and logs) any errors
   *
   * @param objectiveId - id of objective to try to advance
   * @param response - response builder; will be modified by the method
   */
  async crank(objectiveId: string, response: WalletResponse): Promise<void> {
    const objective = await this.store.getObjective(objectiveId);

    switch (objective.type) {
      case 'OpenChannel':
        return this.channelOpener.crank(objective, response);
      case 'CloseChannel':
        return this.crankCloseChannel(objective, response);
      default:
        throw new Error(`ObjectiveManager.crank(): unsupported objective`);
    }
  }

  private get channelOpener(): ChannelOpener {
    return ChannelOpener.create(this.store, this.chainService, this.logger, this.timingMetrics);
  }

  async crankCloseChannel(
    objective: DBCloseChannelObjective,
    response: WalletResponse
  ): Promise<void> {
    const channelToLock = objective.data.targetChannelId;

    let attemptAnotherProtocolStep = true;

    while (attemptAnotherProtocolStep) {
      await this.store.lockApp(channelToLock, async tx => {
        const protocolState = await getCloseChannelProtocolState(
          this.store,
          objective.data.targetChannelId,
          tx
        );
        const nextAction = recordFunctionMetrics(
          closeChannelProtocol(protocolState),
          this.timingMetrics
        );

        if (nextAction) {
          try {
            switch (nextAction.type) {
              case 'SignState':
                await this.signState(nextAction, protocolState, tx, response);
                break;
              case 'CompleteObjective':
                attemptAnotherProtocolStep = false;
                await this.completeObjective(objective, protocolState, tx, response);
                break;
              case 'Withdraw':
                await this.withdraw(nextAction, protocolState, tx);
                break;
              case 'RequestLedgerDefunding':
                await this.requestLedgerDefunding(protocolState, tx);
                break;
              default:
                unreachable(nextAction);
            }
          } catch (error) {
            this.logger.error({error}, 'Error handling action');
            await tx.rollback(error);
            attemptAnotherProtocolStep = false;
          }
        } else {
          response.queueChannelState(protocolState.app);
          attemptAnotherProtocolStep = false;
        }
      });
    }
  }

  public async commenceCloseChannel(channelId: Bytes32, response: WalletResponse): Promise<void> {
    return CloseChannelObjective.commence(channelId, response, this.store);
  }

  // -------
  // Actions
  // -------

  private async signState(
    action: SignState,
    protocolState: SupportedProtocolState,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    const {myIndex, channelId} = protocolState.app;
    const channel = await Channel.forId(channelId, tx);
    const signedState = await this.store.signState(channel, action, tx);
    response.queueState(signedState, myIndex, channelId);
  }

  private async completeObjective(
    objective: DBObjective,
    protocolState: SupportedProtocolState,
    tx: Transaction,
    response: WalletResponse
  ): Promise<void> {
    await this.store.markObjectiveAsSucceeded(objective, tx);

    response.queueChannelState(protocolState.app);
    response.queueSucceededObjective(objective);
  }

  private async withdraw(
    action: Withdraw,
    protocolState: SupportedProtocolState,
    tx: Transaction
  ): Promise<void> {
    await this.store.addChainServiceRequest(action.channelId, 'withdraw', tx);
    // app.supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
    // Note, we are not awaiting transaction submission
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.chainService.concludeAndWithdraw([protocolState.app.supported!]);
  }

  private async requestLedgerDefunding(
    protocolState: SupportedProtocolState,
    tx: Transaction
  ): Promise<void> {
    await LedgerRequest.requestLedgerDefunding(
      protocolState.app.channelId,
      protocolState.app.fundingLedgerChannelId as string,
      tx
    );
  }
}
