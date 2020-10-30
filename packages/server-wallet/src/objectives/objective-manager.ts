import {Logger} from 'pino';
import {serializeMessage, Participant, BN, Payload} from '@statechannels/wallet-core';
import {TransactionOrKnex} from 'objection';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Bytes32} from '../type-aliases';
import * as OpenChannelProtocol from '../protocols/open-channel';
import * as CloseChannelProtocol from '../protocols/close-channel';
import * as ChannelState from '../protocols/state';
import {Store} from '../wallet/store';
import {Channel} from '../models/channel';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceInterface} from '../chain-service';
import {Outgoing, ProtocolAction} from '../protocols/actions';
import {recordFunctionMetrics} from '../metrics';

interface ObjectiveManagerParams {
  store: Store;
  logger: Logger;
  chainService: ChainServiceInterface;
  timingMetrics: boolean;
}

// todo: currently duplicated in wallet/index.ts
type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  error?: any;
};

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

  async crank(objectiveId: string): Promise<ExecutionResult> {
    const outbox: Outgoing[] = [];
    const channelResults: ChannelResult[] = [];
    let maybeError: any = undefined;

    const objective = await this.store.getObjective(objectiveId);

    let channelToLock;

    if (objective.type === 'OpenChannel' || objective.type === 'CloseChannel')
      channelToLock = objective.data.targetChannelId;
    else throw new Error('crankToCompletion: unsupported objective');

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
              const {myIndex, participants, channelId} = protocolState.app;
              const signedState = await this.store.signState(action.channelId, action, tx);
              createOutboxFor(channelId, myIndex, participants, {
                signedStates: [signedState],
              }).map(outgoing => outbox.push(outgoing));
              return;
            }
            case 'FundChannel':
              await this.store.addChainServiceRequest(action.channelId, 'fund', tx);
              await this.chainService.fundChannel({
                ...action,
                expectedHeld: BN.from(action.expectedHeld),
                amount: BN.from(action.amount),
              });
              return;
            case 'CompleteObjective':
              await this.store.markObjectiveAsSucceeded(objective, tx);
              channelResults.push(ChannelState.toChannelResult(protocolState.app));
              attemptAnotherProtocolStep = false;
              return;
            case 'Withdraw':
              await this.store.addChainServiceRequest(action.channelId, 'withdraw', tx);
              // app.supported is defined (if the wallet is functioning correctly), but the compiler is not aware of that
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              await this.chainService.concludeAndWithdraw([protocolState.app.supported!]);
              return;
            case 'RequestLedgerFunding': {
              const ledgerChannelId = await determineWhichLedgerToUse(protocolState.app, tx);
              await LedgerRequest.requestLedgerFunding(
                protocolState.app.channelId,
                ledgerChannelId,
                tx
              );
              return;
            }
            case 'RequestLedgerDefunding': {
              const ledgerChannelId = await determineWhichLedgerToUse(protocolState.app, tx);
              await LedgerRequest.requestLedgerDefunding(
                protocolState.app.channelId,
                ledgerChannelId,
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
            maybeError = error;
            attemptAnotherProtocolStep = false;
          }
        } else {
          channelResults.push(ChannelState.toChannelResult(protocolState.app));
          attemptAnotherProtocolStep = false;
        }
      });
    }

    return {channelResults, outbox, error: maybeError};
  }
}

// todo: refactor this away
const createOutboxFor = (
  channelId: Bytes32,
  myIndex: number,
  participants: Participant[],
  data: Payload
): Outgoing[] =>
  participants
    .filter((_p, i: number): boolean => i !== myIndex)
    .map(({participantId: recipient}) => ({
      method: 'MessageQueued' as const,
      params: serializeMessage(data, recipient, participants[myIndex].participantId, channelId),
    }));

const determineWhichLedgerToUse = async (
  channel: ChannelState.ChannelState,
  txOrKnex: TransactionOrKnex
): Promise<Bytes32> => {
  if (channel?.supported) {
    if (channel.fundingStrategy === 'Ledger') {
      if (channel.fundingLedgerChannelId) {
        const ledgerChannelId = channel.fundingLedgerChannelId;
        // TODO: remove this check? should be preventable / never need to happen
        const ledgerRecord = await Channel.forId(ledgerChannelId, txOrKnex);
        if (!ledgerRecord) {
          throw new Error('cannot fund app, no ledger channel w/ that asset. abort');
        }
        return ledgerChannelId;
      }
      throw new Error('ledger funded app has no fundingLedgerChannelId');
    }
    throw new Error('cannot fund app that is not ledger funded');
  } else {
    throw new Error('cannot fund unsupported app');
  }
};
