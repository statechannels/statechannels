import {Logger} from 'pino';
import {BN} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';
import * as OpenChannelProtocol from '../protocols/open-channel';
import * as CloseChannelProtocol from '../protocols/close-channel';
import * as ChannelState from '../protocols/state';
import {Store} from '../wallet/store';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceInterface} from '../chain-service';
import {ProtocolAction} from '../protocols/actions';
import {recordFunctionMetrics} from '../metrics';
import {WalletResponse} from '../wallet/response-builder';
import {Channel} from '../models/channel';

import {ObjectiveManagerParams} from './types';
import {CloseChannelObjective} from './close-channel';

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
        let executeProtocol: () => ChannelState.ProtocolResult;
        let protocolState: OpenChannelProtocol.ProtocolState | CloseChannelProtocol.ProtocolState;

        if (objective.type === 'OpenChannel') {
          protocolState = await OpenChannelProtocol.getOpenChannelProtocolState(
            this.store,
            objective.data.targetChannelId,
            tx
          );
          executeProtocol = () =>
            OpenChannelProtocol.protocol(protocolState as OpenChannelProtocol.ProtocolState);
        } else if (objective.type === 'CloseChannel') {
          protocolState = await CloseChannelProtocol.getCloseChannelProtocolState(
            this.store,
            objective.data.targetChannelId,
            tx
          );
          executeProtocol = () =>
            CloseChannelProtocol.protocol(protocolState as CloseChannelProtocol.ProtocolState);
        } else {
          throw new Error('Unexpected objective');
        }

        const doAction = async (action: ProtocolAction): Promise<any> => {
          switch (action.type) {
            case 'SignState': {
              const {myIndex, channelId} = protocolState.app;
              const channel = await Channel.forId(channelId, tx);
              const signedState = await this.store.signState(channel, action, tx);
              response.queueState(signedState, myIndex, channelId);
              return;
            }
            case 'FundChannel':
              await this.store.addChainServiceRequest(action.channelId, 'fund', tx);
              // Note, we are not awaiting transaction submission
              this.chainService.fundChannel({
                ...action,
                expectedHeld: BN.from(action.expectedHeld),
                amount: BN.from(action.amount),
              });
              return;
            case 'CompleteObjective':
              await this.store.markObjectiveAsSucceeded(objective, tx);

              response.queueChannelState(protocolState.app);
              response.queueSucceededObjective(objective);
              attemptAnotherProtocolStep = false;
              return;
            case 'Withdraw':
              await this.store.addChainServiceRequest(action.channelId, 'withdraw', tx);
              // app.supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
              // Note, we are not awaiting transaction submission
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              await this.chainService.concludeAndWithdraw([protocolState.app.supported!]);
              return;
            case 'RequestLedgerFunding': {
              await LedgerRequest.requestLedgerFunding(
                protocolState.app.channelId,
                protocolState.app.fundingLedgerChannelId as string,
                tx
              );
              return;
            }
            case 'RequestLedgerDefunding': {
              await LedgerRequest.requestLedgerDefunding(
                protocolState.app.channelId,
                protocolState.app.fundingLedgerChannelId as string,
                tx
              );
              return;
            }
            default:
              throw 'Unimplemented';
          }
        };

        const nextAction = recordFunctionMetrics(executeProtocol(), this.timingMetrics);

        if (nextAction) {
          try {
            await doAction(nextAction);
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
}
