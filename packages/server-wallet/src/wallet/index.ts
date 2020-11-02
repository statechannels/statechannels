import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  JoinChannelParams,
  CloseChannelParams,
  ChannelResult,
  GetStateParams,
  Address,
  Participant as APIParticipant,
  ChannelId,
  FundingStrategy,
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
  Payload,
  assetHolderAddress as getAssetHolderAddress,
  Zero,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import Knex from 'knex';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import {ethers} from 'ethers';

import {Bytes, Bytes32, Uint256} from '../type-aliases';
import {Outgoing} from '../protocols/actions';
import {logger} from '../logger';
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
import {DBObjective} from '../models/objective';
import {LedgerRequest} from '../models/ledger-request';
import {ObjectiveManager} from '../objectives';
import {hasSupportedState, isMyTurn} from '../handlers/helpers';

import {Store, AppHandler, MissingAppHandler} from './store';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
export type SingleChannelOutput = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
  objectivesToApprove?: Omit<DBObjective, 'status'>[];
};
export type MultipleChannelOutput = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  objectivesToApprove?: Omit<DBObjective, 'status'>[];
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
  registerAppDefinition(appDefinition: string): Promise<void>;
  registerAppBytecode(appDefinition: string, bytecode: string): Promise<void>;
  // App channel management
  createChannels(
    args: CreateChannelParams,
    numberOfChannels: number
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
  workerManager: WorkerManager;
  knex: Knex;
  store: Store;
  chainService: ChainServiceInterface;
  objectiveManager: ObjectiveManager;

  readonly walletConfig: ServerWalletConfig;
  constructor(walletConfig?: ServerWalletConfig) {
    super();
    this.walletConfig = walletConfig || defaultConfig;
    this.workerManager = new WorkerManager(this.walletConfig);
    this.knex = Knex(extractDBConfigFromServerWalletConfig(this.walletConfig));
    this.store = new Store(
      this.knex,
      this.walletConfig.timingMetrics,
      this.walletConfig.skipEvmValidation,
      this.walletConfig.chainNetworkID
    );

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

    this.objectiveManager = ObjectiveManager.create({
      store: this.store,
      chainService: this.chainService,
      logger,
      timingMetrics: this.walletConfig.timingMetrics,
    });
  }

  public async registerAppDefinition(appDefinition: string): Promise<void> {
    const bytecode = await this.chainService.fetchBytecode(appDefinition);
    await this.store.upsertBytecode(this.walletConfig.chainNetworkID, appDefinition, bytecode);
  }

  public async registerAppBytecode(appDefinition: string, bytecode: string): Promise<void> {
    return this.store.upsertBytecode(this.walletConfig.chainNetworkID, appDefinition, bytecode);
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
    await this.workerManager.destroy();
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

  async createLedgerChannel(
    args: Pick<CreateChannelParams, 'participants' | 'allocations'>,
    fundingStrategy: 'Direct' | 'Fake' = 'Direct'
  ): Promise<SingleChannelOutput> {
    const {participants: serializedParticipants, allocations} = args;

    const participants = serializedParticipants.map(convertToParticipant);
    const outcome = deserializeAllocations(allocations);

    const {channelResult, outbox} = await this.createChannelInternal(
      ethers.constants.AddressZero, // appDefinition
      '0x00', // appData,
      participants,
      outcome, // outcome
      fundingStrategy, // fundingStrategy,
      undefined, // fundingLedgerChannelId
      'ledger' // role
    );

    this.registerChannelWithChainService(channelResult);

    return {channelResult, outbox};
  }

  async createChannel(args: CreateChannelParams): Promise<MultipleChannelOutput> {
    return this.createChannels(args, 1);
  }

  async createChannels(
    args: CreateChannelParams,
    numberOfChannels: number
  ): Promise<MultipleChannelOutput> {
    const {
      participants: serializedParticipants,
      appDefinition,
      appData,
      allocations,
      fundingStrategy,
      fundingLedgerChannelId,
    } = args;

    const participants = serializedParticipants.map(convertToParticipant);
    const outcome: Outcome = deserializeAllocations(allocations);

    const results = await Promise.all(
      _.range(numberOfChannels).map(() =>
        this.createChannelInternal(
          appDefinition,
          appData,
          participants,
          outcome,
          fundingStrategy,
          fundingLedgerChannelId,
          'app'
        )
      )
    );

    const channelResults = results.map(r => r.channelResult);
    const outbox = results.map(r => r.outbox).reduce((p, c) => p.concat(c));

    channelResults.map(cR => this.registerChannelWithChainService(cR));

    return {
      channelResults: mergeChannelResults(channelResults),
      outbox: mergeOutgoing(outbox),
    };
  }

  private async createChannelInternal(
    appDefinition: Address,
    appData: Bytes,
    participants: Participant[],
    outcome: Outcome,
    fundingStrategy: FundingStrategy,
    fundingLedgerChannelId?: Bytes32,
    role: 'app' | 'ledger' = 'app'
  ): Promise<SingleChannelOutput> {
    const channelNonce = await this.store.nextNonce(participants.map(p => p.signingAddress));

    const constants = {
      appDefinition,
      chainId: this.walletConfig.chainNetworkID,
      challengeDuration: 9001,
      channelNonce,
      participants,
    };

    const {channel, firstSignedState: signedState, objective} = await this.store.createChannel(
      constants,
      appData,
      outcome,
      fundingStrategy,
      role,
      fundingLedgerChannelId
    );

    return {
      channelResult: ChannelState.toChannelResult(channel),
      outbox: createOutboxFor(channel.channelId, channel.myIndex, participants, {
        signedStates: [signedState],
        objectives: [objective],
      }),
    };
  }

  async joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput> {
    const objectives = await this.store.getObjectives(channelIds);

    await Promise.all(
      objectives.map(
        async ({type, objectiveId}) =>
          type === 'OpenChannel' && (await this.store.approveObjective(objectiveId))
      )
    );

    const {outbox, channelResults} = await this.takeActions(channelIds);

    channelResults.map(cR => this.registerChannelWithChainService(cR));

    return {channelResults: mergeChannelResults(channelResults), outbox: mergeOutgoing(outbox)};
  }

  async joinChannel({channelId}: JoinChannelParams): Promise<SingleChannelOutput> {
    const channel = await this.store.getChannel(channelId);

    if (!channel)
      throw new JoinChannel.JoinChannelError(
        JoinChannel.JoinChannelError.reasons.channelNotFound,
        channelId
      );

    const objectives = await this.store.getObjectives([channelId]);

    if (objectives.length === 0)
      throw new Error(`Could not find objective for channel ${channelId}`);

    if (objectives[0].type === 'OpenChannel')
      await this.store.approveObjective(objectives[0].objectiveId);

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
      return this.workerManager.updateChannel(args);
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

  async closeChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    for (const channelId of channelIds) await this.closeChannelInternal(channelId);

    const {channelResults, outbox} = await this.takeActions(channelIds);

    (outbox[0].params.data as Payload).objectives = channelIds.map(channelId => ({
      type: 'CloseChannel',
      participants: [],
      data: {targetChannelId: channelId, fundingStrategy: 'Unknown'},
    }));

    return {channelResults: mergeChannelResults(channelResults), outbox: mergeOutgoing(outbox)};
  }

  async closeChannel({channelId}: CloseChannelParams): Promise<SingleChannelOutput> {
    const {outbox, channelResults} = await this.closeChannels([channelId]);
    return {outbox, channelResult: channelResults[0]};
  }

  private async closeChannelInternal(channelId: Bytes32): Promise<void> {
    await this.store.lockApp(
      channelId,
      async (tx, channel) => {
        if (hasSupportedState(channel) && !isMyTurn(channel))
          throw new CloseChannel.CloseChannelError(
            CloseChannel.CloseChannelError.reasons.notMyTurn
          );

        await this.store.addObjective(
          {
            type: 'CloseChannel',
            participants: [],
            data: {targetChannelId: channelId, fundingStrategy: channel.fundingStrategy},
          },
          tx
        );
      },
      () => {
        throw new CloseChannel.CloseChannelError(
          CloseChannel.CloseChannelError.reasons.channelMissing,
          {channelId}
        );
      }
    );
  }

  async getLedgerChannels(
    assetHolderAddress: string,
    participants: APIParticipant[]
  ): Promise<MultipleChannelOutput> {
    const channelStates = await this.store.getLedgerChannels(
      assetHolderAddress,
      participants.map(convertToParticipant)
    );
    return {
      channelResults: mergeChannelResults(channelStates.map(ChannelState.toChannelResult)),
      outbox: [],
    };
  }

  async getChannels(): Promise<MultipleChannelOutput> {
    const channelStates = await this.store.getChannels();
    return {
      channelResults: mergeChannelResults(
        channelStates.map(cS => ChannelState.toChannelResult(cS))
      ),
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
      throw err;
    }
  }

  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    if (this.walletConfig.workerThreadAmount > 0) {
      return this.workerManager.pushMessage(rawPayload);
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

    for (const channel of mergeChannelResults(fromStoring)) {
      if (!_.some(channelResults, c => c.channelId === channel.channelId))
        channelResults.push(channel);
    }

    if (wirePayload.requests && wirePayload.requests.length > 0)
      // Modifies outbox, may append new messages
      await Promise.all(wirePayload.requests.map(wP => handleRequest(outbox)(wP)));

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
      await this.crankUntilIdle(channels, accumulator);
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

    const ledgersToProcess = _.uniqBy(
      await this.store.getAllPendingLedgerRequests(),
      'ledgerChannelId'
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
              case 'SignLedgerState': {
                const {myIndex, participants, channelId} = protocolState.fundingChannel;

                const payload = {
                  signedStates: [await this.store.signState(channelId, action.stateToSign, tx)],
                };

                await Promise.all(
                  action.channelsNotFunded.map(
                    async c => await LedgerRequest.setRequestStatus(c, 'fund', 'failed', tx)
                  )
                );

                const messages = createOutboxFor(channelId, myIndex, participants, payload);

                messages.forEach(message => outbox.push(message));

                return;
              }

              case 'MarkLedgerFundingRequestsAsComplete':
                await LedgerRequest.markLedgerRequestsSuccessful(action.fundedChannels, 'fund', tx);
                await LedgerRequest.markLedgerRequestsSuccessful(
                  action.defundedChannels,
                  'defund',
                  tx
                );
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

  // todo(tom): change function to return a value instead of mutating input args
  private async crankUntilIdle(
    channels: Bytes32[],
    {outbox, channelResults, error}: ExecutionResult
  ): Promise<void> {
    const channelsWithPendingReqs = (await LedgerRequest.getAllPendingRequests(this.knex)).map(
      l => l.channelToBeFunded
    );

    const objectives = (await this.store.getObjectives(channels.concat(channelsWithPendingReqs)))
      .filter(x => x !== undefined)
      .filter(o => o?.status === 'approved');

    // todo(tom): why isn't this just a for loop?
    while (objectives.length && !error) {
      const objective = objectives[0];

      const {
        channelResults: newChannelResults,
        outbox: newOutbox,
        error: newError,
      } = await this.objectiveManager.crank(objective.objectiveId);

      // add channel result
      channelResults.push(...newChannelResults);
      outbox.push(...newOutbox);

      // todo(tom): this how the code behaved previously. Is it actually what we want?
      error = newError;

      // remove objective from list
      objectives.shift();
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
