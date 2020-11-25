import {Logger} from 'pino';
import {BN} from '@statechannels/wallet-core';
import {Transaction} from 'objection';

import {Bytes32} from '../type-aliases';
import {
  getOpenChannelProtocolState,
  ProtocolState as OpenChannelProtocolState,
  protocol as openChannelProtocol,
} from '../protocols/open-channel';
import {
  getCloseChannelProtocolState,
  ProtocolState as CloseChannelProtocolState,
  protocol as closeChannelProtocol,
} from '../protocols/close-channel';
import * as ChannelState from '../protocols/state';
import {Store} from '../wallet/store';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceInterface} from '../chain-service';
import {FundChannel, SignState, Withdraw} from '../protocols/actions';
import {recordFunctionMetrics} from '../metrics';
import {WalletResponse} from '../wallet/response-builder';
import {Channel} from '../models/channel';
import {DBObjective} from '../models/objective';

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

    let channelToLock;

    if (objective.type === 'OpenChannel' || objective.type === 'CloseChannel')
      channelToLock = objective.data.targetChannelId;
    else throw new Error('ObjectiveManager.crank(): unsupported objective');

    let attemptAnotherProtocolStep = true;

    while (attemptAnotherProtocolStep) {
      await this.store.lockApp(channelToLock, async tx => {
        let nextAction: ChannelState.ProtocolResult;
        let protocolState: SupportedProtocolState;

        if (objective.type === 'OpenChannel') {
          protocolState = await getOpenChannelProtocolState(
            this.store,
            objective.data.targetChannelId,
            tx
          );
          nextAction = recordFunctionMetrics(
            openChannelProtocol(protocolState as OpenChannelProtocolState),
            this.timingMetrics
          );
        } else if (objective.type === 'CloseChannel') {
          protocolState = await getCloseChannelProtocolState(
            this.store,
            objective.data.targetChannelId,
            tx
          );
          nextAction = recordFunctionMetrics(
            closeChannelProtocol(protocolState as OpenChannelProtocolState),
            this.timingMetrics
          );
        } else {
          throw new Error('Unexpected objective');
        }

        if (nextAction) {
          try {
            switch (nextAction.type) {
              case 'SignState':
                await this.signState(nextAction, protocolState, tx, response);
                break;
              case 'FundChannel':
                await this.fundChannel(nextAction, tx);
                break;
              case 'CompleteObjective':
                attemptAnotherProtocolStep = false;
                await this.completeObjective(objective, protocolState, tx, response);
                break;
              case 'Withdraw':
                await this.withdraw(nextAction, protocolState, tx);
                break;
              case 'RequestLedgerFunding':
                await this.requestLedgerFunding(protocolState, tx);
                break;
              case 'RequestLedgerDefunding':
                await this.requestLedgerDefunding(protocolState, tx);
                break;
              default:
                throw 'Unimplemented';
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

  private async fundChannel(action: FundChannel, tx: Transaction): Promise<void> {
    await this.store.addChainServiceRequest(action.channelId, 'fund', tx);
    // Note, we are not awaiting transaction submission
    this.chainService.fundChannel({
      ...action,
      expectedHeld: BN.from(action.expectedHeld),
      amount: BN.from(action.amount),
    });
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

  private async requestLedgerFunding(
    protocolState: SupportedProtocolState,
    tx: Transaction
  ): Promise<void> {
    await LedgerRequest.requestLedgerFunding(
      protocolState.app.channelId,
      protocolState.app.fundingLedgerChannelId as string,
      tx
    );
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
