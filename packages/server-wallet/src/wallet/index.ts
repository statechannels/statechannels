import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  JoinChannelParams,
  CloseChannelParams,
  ChannelResult,
  GetStateParams,
  Address,
  ChannelId,
} from '@statechannels/client-api-schema';
import {
  deserializeAllocations,
  validatePayload,
  ChannelRequest,
  Outcome,
  convertToParticipant,
  Participant,
  BN,
  serializeMessage,
  ChannelConstants,
  Payload,
  assetHolderAddress as getAssetHolderAddress,
  Zero,
  Objective,
  objectiveId,
  checkThat,
  isSimpleAllocation,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import Knex from 'knex';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';

import {Bytes32, Uint256} from '../type-aliases';
import {Outgoing, ProtocolAction} from '../protocols/actions';
import {logger} from '../logger';
import * as OpenChannelProtocol from '../protocols/open-channel';
import * as CloseChannelProtocol from '../protocols/close-channel';
import * as ProcessLedgerQueue from '../protocols/process-ledger-queue';
import * as UpdateChannel from '../handlers/update-channel';
import * as CloseChannel from '../handlers/close-channel';
import * as JoinChannel from '../handlers/join-channel';
import * as ChannelState from '../protocols/state';
import {isWalletError} from '../errors/wallet-error';
import {timerFactory, recordFunctionMetrics, setupMetrics} from '../metrics';
import {WorkerManager} from '../utilities/workers/manager';
import {mergeChannelResults, mergeOutgoing} from '../utilities/messaging';
import {ServerWalletConfig, extractDBConfigFromServerWalletConfig, defaultConfig} from '../config';
import {
  ChainServiceInterface,
  ChainEventSubscriberInterface,
  HoldingUpdatedArg,
  AssetTransferredArg,
  ChainService,
  MockChainService,
} from '../chain-service';
import {DBAdmin} from '../db-admin/db-admin';
import {Objective as ObjectiveModel} from '../models/objective';
import {AppBytecode} from '../models/app-bytecode';

import {Store, AppHandler, MissingAppHandler, ObjectiveStoredInDB} from './store';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
export type SingleChannelOutput = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
  objectivesToApprove?: Omit<ObjectiveStoredInDB, 'status'>[];
};
export type MultipleChannelOutput = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  objectivesToApprove?: Omit<ObjectiveStoredInDB, 'status'>[];
};
type Message = SingleChannelOutput | MultipleChannelOutput;

export type WalletEventName = 'channelUpdate';
type WalletEvent = {[key in WalletEventName]: SingleChannelOutput};

const isSingleChannelMessage = (message: Message): message is SingleChannelOutput =>
  'channelResult' in message;

export interface UpdateChannelFundingParams {
  channelId: ChannelId;
  token?: Address;
  amount: Uint256;
}

export type WalletInterface = {
  // App utilities
  getParticipant(): Promise<Participant | undefined>;
  registerAppDefintion(appDefinition: string): Promise<void>;
  // App channel management
  createChannels(
    args: CreateChannelParams,
    amountOfChannels: number
  ): Promise<MultipleChannelOutput>;

  joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput>;
  updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput>;
  closeChannel(args: CloseChannelParams): Promise<SingleChannelOutput>;
  getChannels(): Promise<MultipleChannelOutput>;
  getState(args: GetStateParams): Promise<SingleChannelOutput>;
  syncChannel(args: SyncChannelParams): Promise<SingleChannelOutput>;

  updateFundingForChannels(args: UpdateChannelFundingParams[]): Promise<MultipleChannelOutput>;
  // Wallet <-> Wallet communication
  pushMessage(m: unknown): Promise<MultipleChannelOutput>;

  mergeMessages(messages: Message[]): MultipleChannelOutput;
};

export class Wallet extends EventEmitter<WalletEvent>
  implements WalletInterface, ChainEventSubscriberInterface {
  manager: WorkerManager;
  knex: Knex;
  store: Store;
  chainService: ChainServiceInterface;

  readonly walletConfig: ServerWalletConfig;
  constructor(walletConfig?: ServerWalletConfig) {
    super();
    this.walletConfig = walletConfig || defaultConfig;
    this.manager = new WorkerManager(this.walletConfig);
    this.knex = Knex(extractDBConfigFromServerWalletConfig(this.walletConfig));
    this.store = new Store(
      this.knex,
      this.walletConfig.timingMetrics,
      this.walletConfig.skipEvmValidation
    );

    // Bind methods to class instance
    this.getParticipant = this.getParticipant.bind(this);
    this.updateChannelFunding = this.updateChannelFunding.bind(this);
    this.updateFundingForChannels = this.updateFundingForChannels.bind(this);
    this.getSigningAddress = this.getSigningAddress.bind(this);

    this.createChannels = this.createChannels.bind(this);
    this.createChannelInternal = this.createChannelInternal.bind(this);

    this.joinChannels = this.joinChannels.bind(this);
    this.updateChannel = this.updateChannel.bind(this);
    this.updateChannelInternal = this.updateChannelInternal.bind(this);
    this.pushMessageInternal = this.pushMessageInternal.bind(this);
    this.closeChannel = this.closeChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getState = this.getState.bind(this);
    this.pushMessage = this.pushMessage.bind(this);
    this.takeActions = this.takeActions.bind(this);
    this.mergeMessages = this.mergeMessages.bind(this);
    this.registerChannelWithChainService = this.registerChannelWithChainService.bind(this);
    this.destroy = this.destroy.bind(this);
    this.registerAppDefintion = this.registerAppDefintion.bind(this);

    // set up timing metrics
    if (this.walletConfig.timingMetrics) {
      if (!this.walletConfig.metricsOutputFile) {
        throw Error('You must define a metrics output file');
      }
      setupMetrics(this.walletConfig.metricsOutputFile);
    }

    if (walletConfig?.rpcEndpoint && walletConfig.serverPrivateKey) {
      this.chainService = new ChainService(walletConfig.rpcEndpoint, walletConfig.serverPrivateKey);
    } else {
      logger.debug(
        'rpcEndpoint and serverPrivateKey must be defined for the wallet to use chain service'
      );
      this.chainService = new MockChainService();
    }
  }

  public async registerAppDefintion(appDefinition: string): Promise<void> {
    const bytecode = await this.chainService.fetchBytecode(appDefinition);
    if (!bytecode) {
      throw Error(`Could not fetch bytecode for ${appDefinition}`);
    }

    await AppBytecode.upsertBytecode(
      this.walletConfig.chainNetworkID,
      appDefinition,
      bytecode,
      this.knex
    );
  }

  public mergeMessages(messages: Message[]): MultipleChannelOutput {
    const channelResults = mergeChannelResults(
      messages
        .map(m => (isSingleChannelMessage(m) ? [m.channelResult] : m.channelResults))
        .reduce((cr1, cr2) => cr1.concat(cr2))
    );

    const outbox = mergeOutgoing(messages.map(m => m.outbox).reduce((m1, m2) => m1.concat(m2)));
    return {channelResults, outbox};
  }

  public async destroy(): Promise<void> {
    await this.manager.destroy();
    await this.store.destroy(); // TODO this destroys this.knex(), which seems quite unexpected
    this.chainService.destructor();
  }

  public async syncChannel({channelId}: SyncChannelParams): Promise<SingleChannelOutput> {
    const {states, channelState} = await this.store.getStates(channelId);

    const {participants, myIndex} = channelState;

    return {
      outbox: createOutboxFor(channelId, myIndex, participants, {
        signedStates: states,
        requests: [{type: 'GetChannel', channelId}],
      }),
      channelResult: ChannelState.toChannelResult(channelState),
    };
  }

  public async getParticipant(): Promise<Participant | undefined> {
    let participant: Participant | undefined = undefined;

    try {
      participant = await this.store.getFirstParticipant();
    } catch (e) {
      if (isWalletError(e)) logger.error('Wallet failed to get a participant', e);
      else throw e;
    }

    return participant;
  }

  public async updateFundingForChannels(
    args: UpdateChannelFundingParams[]
  ): Promise<MultipleChannelOutput> {
    const results = await Promise.all(args.map(a => this.updateChannelFunding(a)));

    const channelResults = results.map(r => r.channelResult);
    const outgoing = results.map(r => r.outbox).reduce((p, c) => p.concat(c));

    return {
      channelResults: mergeChannelResults(channelResults),
      outbox: mergeOutgoing(outgoing),
    };
  }
  async updateChannelFunding({
    channelId,
    token,
    amount,
  }: UpdateChannelFundingParams): Promise<SingleChannelOutput> {
    const assetHolderAddress = getAssetHolderAddress(token || Zero);
    return this.updateChannelFundingForAssetHolder({
      channelId,
      assetHolderAddress,
      amount: BN.from(amount),
    });
  }

  private async updateChannelFundingForAssetHolder({
    channelId,
    assetHolderAddress,
    amount,
  }: HoldingUpdatedArg): Promise<SingleChannelOutput> {
    await this.store.updateFunding(channelId, BN.from(amount), assetHolderAddress);
    const {channelResults, outbox} = await this.takeActions([channelId]);
    return {outbox, channelResult: channelResults[0]};
  }

  public async getSigningAddress(): Promise<string> {
    return await this.store.getOrCreateSigningAddress();
  }

  // TODO: Discussion item --- how should an App tell the wallet a channel is a Ledger?
  __setLedger(ledgerChannelId: Bytes32, assetHolderAddress: Address): void {
    this.store.ledgers[ledgerChannelId] = {
      ledgerChannelId,
      assetHolderAddress,
    };
  }

  async createChannel(args: CreateChannelParams): Promise<MultipleChannelOutput> {
    return this.createChannels(args, 1);
  }
  async createChannels(
    args: CreateChannelParams,
    amountOfChannels: number
  ): Promise<MultipleChannelOutput> {
    const {participants, appDefinition, appData, allocations, fundingStrategy} = args;
    const outcome: Outcome = deserializeAllocations(allocations);
    const results = await Promise.all(
      _.range(amountOfChannels).map(async () => {
        const channelNonce = await this.store.nextNonce(participants.map(p => p.signingAddress));
        const constants: ChannelConstants = {
          channelNonce,
          participants: participants.map(convertToParticipant),
          chainId: this.walletConfig.chainNetworkID,
          challengeDuration: 9001,
          appDefinition,
        };
        return this.store.createChannel(constants, appData, outcome, fundingStrategy);
      })
    );
    const channelResults = results.map(r => r.channelResult);
    const outgoing = results.map(r => r.outgoing).reduce((p, c) => p.concat(c));
    channelResults.map(this.registerChannelWithChainService);
    return {
      channelResults: mergeChannelResults(channelResults),
      outbox: mergeOutgoing(outgoing),
    };
  }

  async createChannelInternal(
    args: CreateChannelParams,
    channelNonce: number
  ): Promise<SingleChannelOutput> {
    const {participants, appDefinition, appData, allocations, fundingStrategy} = args;
    const outcome: Outcome = deserializeAllocations(allocations);

    const constants: ChannelConstants = {
      channelNonce,
      participants: participants.map(convertToParticipant),
      chainId: this.walletConfig.chainNetworkID,
      challengeDuration: 9001,
      appDefinition,
    };

    const {outgoing, channelResult} = await this.store.createChannel(
      constants,
      appData,
      outcome,
      fundingStrategy
    );
    return {outbox: mergeOutgoing(outgoing), channelResult};
  }

  async joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput> {
    const objectives = await ObjectiveModel.forChannelIds(channelIds, this.knex);
    await Promise.all(
      objectives
        .map(objective => {
          if (objective.type === 'OpenChannel')
            return ObjectiveModel.approve(objective.objectiveId, this.knex);
          else return;
        })
        .filter(x => x !== undefined)
    );

    const {outbox, channelResults} = await this.takeActions(channelIds);

    channelResults.map(this.registerChannelWithChainService);

    return {channelResults: mergeChannelResults(channelResults), outbox: mergeOutgoing(outbox)};
  }

  async joinChannel({channelId}: JoinChannelParams): Promise<SingleChannelOutput> {
    const channel = await this.store.getChannel(channelId);

    if (!channel)
      throw new JoinChannel.JoinChannelError(
        JoinChannel.JoinChannelError.reasons.channelNotFound,
        channelId
      );

    // FIXME: This is just to get existing joinChannel API pattern to keep working
    const objectives = await ObjectiveModel.forChannelIds([channelId], this.knex);

    if (objectives.length === 0)
      throw new Error(`Could not find objective for channel ${channelId}`);

    if (objectives[0].type === 'OpenChannel')
      await ObjectiveModel.approve(objectives[0].objectiveId, this.knex);
    // END FIXME

    const {outbox, channelResults} = await this.takeActions([channelId]);

    // eslint-disable-next-line
    const channelResult = channelResults.find(c => c.channelId === channelId)!;

    this.registerChannelWithChainService(channelResult);

    return {
      outbox: mergeOutgoing(outbox),
      channelResult,
    };
  }

  async updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput> {
    if (this.walletConfig.workerThreadAmount > 0) {
      return this.manager.updateChannel(args);
    } else {
      return this.updateChannelInternal(args);
    }
  }

  // The internal implementation of updateChannel responsible for actually updating the channel
  async updateChannelInternal({
    channelId,
    allocations,
    appData,
  }: UpdateChannelParams): Promise<SingleChannelOutput> {
    const timer = timerFactory(this.walletConfig.timingMetrics, `updateChannel ${channelId}`);
    const handleMissingChannel: MissingAppHandler<Promise<SingleChannelOutput>> = () => {
      throw new UpdateChannel.UpdateChannelError(
        UpdateChannel.UpdateChannelError.reasons.channelNotFound,
        {channelId}
      );
    };
    const criticalCode: AppHandler<Promise<SingleChannelOutput>> = async (tx, channel) => {
      const {myIndex, participants} = channel;

      const outcome = recordFunctionMetrics(
        deserializeAllocations(allocations),
        this.walletConfig.timingMetrics
      );

      const nextState = getOrThrow(
        recordFunctionMetrics(
          UpdateChannel.updateChannel({channelId, appData, outcome}, channel),
          this.walletConfig.timingMetrics
        )
      );
      const signedState = await timer('signing state', () =>
        this.store.signState(channelId, nextState, tx)
      );

      return {
        outbox: createOutboxFor(channelId, myIndex, participants, {signedStates: [signedState]}),
        channelResult: ChannelState.toChannelResult(await this.store.getChannel(channelId, tx)),
      };
    };

    return this.store.lockApp(channelId, criticalCode, handleMissingChannel);
  }

  async closeChannel({channelId}: CloseChannelParams): Promise<SingleChannelOutput> {
    const handleMissingChannel: MissingAppHandler<void> = () => {
      throw new CloseChannel.CloseChannelError(
        CloseChannel.CloseChannelError.reasons.channelMissing,
        {channelId}
      );
    };

    const criticalCode: AppHandler<void> = async (tx, channel) => {
      // TODO: (Objectives Rewrite) Keeping this here b/c we need to do input validation
      // and check if its our turn and throw an error as existing tests expect
      getOrThrow(CloseChannel.closeChannel(channel));

      // const {outgoing, channelResult} = await this.store.signState(channelId, nextState, tx);
      // return {outbox: outgoing.map(n => n.notice), channelResult};

      const objective: Objective = {
        type: 'CloseChannel',
        participants: [],
        data: {targetChannelId: channelId, fundingStrategy: channel.fundingStrategy},
      };

      const objectiveToStore: ObjectiveStoredInDB = {
        ...objective,
        status: 'approved',
        objectiveId: objectiveId(objective),
      };
      await ObjectiveModel.insert(objectiveToStore, tx);
    };

    await this.store.lockApp(channelId, criticalCode, handleMissingChannel);

    const {channelResults, outbox} = await this.takeActions([channelId]);

    (outbox[0].params.data as Payload).objectives = [
      {
        type: 'CloseChannel',
        participants: [],
        data: {targetChannelId: channelId, fundingStrategy: 'Unknown'}, // TODO get this without another db tx
      },
    ];

    return {outbox, channelResult: channelResults[0]};
  }

  async getChannels(): Promise<MultipleChannelOutput> {
    const channelStates = await this.store.getChannels();
    return {
      channelResults: mergeChannelResults(channelStates.map(ChannelState.toChannelResult)),
      outbox: [],
    };
  }

  async getState({channelId}: GetStateParams): Promise<SingleChannelOutput> {
    try {
      const channel = await this.store.getChannel(channelId);

      return {
        channelResult: ChannelState.toChannelResult(channel),
        outbox: [],
      };
    } catch (err) {
      logger.error({err}, 'Could not get channel');
      throw err; // FIXME: Wallet shoudl return ChannelNotFound
    }
  }

  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    if (this.walletConfig.workerThreadAmount > 0) {
      return this.manager.pushMessage(rawPayload);
    } else {
      return this.pushMessageInternal(rawPayload);
    }
  }

  // The internal implementation of pushMessage responsible for actually pushing the message into the wallet
  async pushMessageInternal(rawPayload: unknown): Promise<MultipleChannelOutput> {
    const store = this.store;

    const wirePayload = validatePayload(rawPayload);

    // TODO: Move into utility somewhere?
    function handleRequest(outbox: Outgoing[]): (req: ChannelRequest) => Promise<void> {
      return async ({channelId}: ChannelRequest): Promise<void> => {
        const {states: signedStates, channelState} = await store.getStates(channelId);

        const {participants, myIndex} = channelState;

        createOutboxFor(channelId, myIndex, participants, {signedStates}).map(outgoing =>
          outbox.push(outgoing)
        );
      };
    }

    const {channelIds, objectives, channelResults: fromStoring} = await this.store.pushMessage(
      wirePayload
    );

    const {channelResults, outbox} = await this.takeActions(channelIds);

    for (const channel of fromStoring) {
      if (!_.some(channelResults, c => c.channelId === channel.channelId))
        channelResults.push(channel);
    }

    if (wirePayload.requests && wirePayload.requests.length > 0)
      // Modifies outbox, may append new messages
      await Promise.all(wirePayload.requests.map(handleRequest(outbox)));

    return {
      outbox: mergeOutgoing(outbox),
      channelResults: mergeChannelResults(channelResults),
      objectivesToApprove: objectives,
    };
  }

  takeActions = async (channels: Bytes32[]): Promise<ExecutionResult> => {
    const outbox: Outgoing[] = [];
    const channelResults: ChannelResult[] = [];

    const accumulator = {outbox, channelResults};

    let needToCrank = true;
    while (needToCrank) {
      await this.crankToCompletion(channels, accumulator);
      needToCrank = await this.processLedgerQueue(accumulator);
    }

    return accumulator;
  };

  private async processLedgerQueue({
    outbox,
    channelResults,
    error,
  }: ExecutionResult): Promise<boolean> {
    let requiresAnotherCrankUponCompletion = false;

    const ledgersToProcess = Object.values(this.store.ledgers).filter(
      async l => (await this.store.getPendingLedgerRequests(l.ledgerChannelId)).length > 0
    );

    while (ledgersToProcess.length && !error) {
      const {ledgerChannelId} = ledgersToProcess[0];

      await this.store.lockApp(ledgerChannelId, async tx => {
        const setError = async (e: Error): Promise<void> => {
          error = e;
          await tx.rollback(error);
        };

        const markLedgerAsProcessed = (): void => {
          ledgersToProcess.shift();
        };

        const addChannelResult = (channel: ChannelState.ChannelState): void => {
          channelResults.push(ChannelState.toChannelResult(channel));
        };

        const protocolState = await ProcessLedgerQueue.getProcessLedgerQueueProtocolState(
          this.store,
          ledgerChannelId,
          tx
        );
        const action = recordFunctionMetrics(
          ProcessLedgerQueue.protocol(protocolState),
          this.walletConfig.timingMetrics
        );

        if (!action) {
          markLedgerAsProcessed();
          addChannelResult(protocolState.fundingChannel);
        } else {
          try {
            switch (action.type) {
              case 'SignState': {
                const {myIndex, participants, channelId} = protocolState.fundingChannel;

                const payload = {
                  signedStates: [await this.store.signState(channelId, action, tx)],
                };

                const messages = createOutboxFor(channelId, myIndex, participants, payload);

                messages.forEach(message => outbox.push(message));

                return;
              }

              case 'MarkLedgerFundingRequestsAsComplete':
                await this.store.markLedgerRequestsSuccessful(action.doneRequests, tx);
                requiresAnotherCrankUponCompletion = true;
                return;

              default:
                throw 'Unimplemented';
            }
          } catch (err) {
            logger.error({err}, 'Error handling action');
            await setError(err);
          }
        }
      });
    }
    return requiresAnotherCrankUponCompletion;
  }

  private async crankToCompletion(
    channels: Bytes32[],
    {outbox, channelResults, error}: ExecutionResult
  ): Promise<void> {
    // NOTE: This weird query could be avoided by adding ledgerChannelId to OpenChannel objective
    const ledgers = channels.filter(async channel => await this.store.isLedger(channel));
    const channelsWithPendingReqs = (
      await Promise.all(ledgers.map(ledger => this.store.getPendingLedgerRequests(ledger)))
    )
      .flat()
      .map(x => x.fundingChannelId);

    const objectives = (
      await ObjectiveModel.forChannelIds(channels.concat(channelsWithPendingReqs), this.store.knex)
    )
      .filter(x => x !== undefined)
      .filter(o => o?.status === 'approved');

    while (objectives.length && !error) {
      const objective = objectives[0];

      let channelToLock;

      if (objective.type === 'OpenChannel' || objective.type === 'CloseChannel')
        channelToLock = objective.data.targetChannelId;
      else throw new Error('crankToCompletion: unsupported objective');

      await this.store.lockApp(channelToLock, async tx => {
        const setError = async (e: Error): Promise<void> => {
          error = e;
          await tx.rollback(error);
        };

        const markObjectiveAsDone = (): void => {
          objectives.shift();
        };

        const addChannelResult = (channel: ChannelState.ChannelState): void => {
          channelResults.push(ChannelState.toChannelResult(channel));
        };

        let protocol;
        let protocolState: OpenChannelProtocol.ProtocolState | CloseChannelProtocol.ProtocolState;

        if (objective.type === 'OpenChannel') {
          protocol = OpenChannelProtocol.protocol;
          protocolState = await OpenChannelProtocol.getOpenChannelProtocolState(
            this.store,
            objective.data.targetChannelId,
            tx
          );
        } else if (objective.type === 'CloseChannel') {
          protocol = CloseChannelProtocol.protocol;
          protocolState = await CloseChannelProtocol.getCloseChannelProtocolState(
            this.store,
            objective.data.targetChannelId,
            tx
          );
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
              if (objective.type === 'OpenChannel')
                await ObjectiveModel.succeed(objective.objectiveId, tx);
              if (objective.type === 'CloseChannel')
                await ObjectiveModel.succeed(objective.objectiveId, tx);
              // TODO: Awkward to use this for undefined and CompleteObjective
              markObjectiveAsDone();
              addChannelResult(protocolState.app);
              return;
            case 'RequestLedgerFunding': {
              const ledgerChannelId = await determineWhichLedgerToUse(
                this.store,
                protocolState.app
              );
              await this.store.requestLedgerFunding(
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

        const nextAction = recordFunctionMetrics(
          protocol(protocolState),
          this.walletConfig.timingMetrics
        );

        if (!nextAction) {
          markObjectiveAsDone();
          addChannelResult(protocolState.app);
        } else {
          try {
            await doAction(nextAction);
          } catch (err) {
            logger.error({err}, 'Error handling action');
            await setError(err);
          }
        }
      });
    }
  }

  // ChainEventSubscriberInterface implementation
  holdingUpdated(arg: HoldingUpdatedArg): void {
    const channelUpdate: WalletEventName = 'channelUpdate';
    this.updateChannelFundingForAssetHolder(arg).then(singleChannelOutput =>
      this.emit(channelUpdate, singleChannelOutput)
    );
  }

  onAssetTransferred(_arg: AssetTransferredArg): void {
    // todo: implement me
  }

  private registerChannelWithChainService(cr: ChannelResult): void {
    const assetHolderAddresses = cr.allocations.map(a => getAssetHolderAddress(a.token));
    this.chainService.registerChannel(cr.channelId, assetHolderAddresses, this);
  }

  dbAdmin(): DBAdmin {
    return new DBAdmin(this.knex);
  }
}

type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  error?: any;
};

// TODO: This should be removed, and not used externally.
// It is a fill-in until the wallet API is specced out.
export function getOrThrow<E, T>(result: Either.Either<E, T>): T {
  return Either.getOrElseW<E, T>(
    (err: E): T => {
      throw err;
    }
  )(result);
}

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

// TODO: Decide if we want to keep this functionality or change the OpenChannel
// objective to include information about _which_ ledger is funding what
const determineWhichLedgerToUse = async (
  store: Store,
  channel: ChannelState.ChannelState
): Promise<Bytes32> => {
  if (channel?.supported) {
    const {assetHolderAddress} = checkThat(channel.supported.outcome, isSimpleAllocation);
    const ledgerRecord = _.find(
      Object.values(store.ledgers),
      v => v.assetHolderAddress === assetHolderAddress
    );
    if (!ledgerRecord) {
      throw new Error('cannot fund app, no ledger channel w/ that asset. abort');
    }
    return ledgerRecord?.ledgerChannelId;
  } else {
    throw new Error('cannot fund unsupported app');
  }
};
