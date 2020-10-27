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
      this.walletConfig.skipEvmValidation,
      this.walletConfig.chainNetworkID
    );

    // Bind methods to class instance
    this.getParticipant = this.getParticipant.bind(this);
    this.updateChannelFunding = this.updateChannelFunding.bind(this);
    this.updateFundingForChannels = this.updateFundingForChannels.bind(this);
    this.getSigningAddress = this.getSigningAddress.bind(this);

    this.createChannels = this.createChannels.bind(this);

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

    await this.store.upsertBytecode(this.walletConfig.chainNetworkID, appDefinition, bytecode);
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

  async joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput> {
    const objectives = await this.store.getObjectives(channelIds);
    await Promise.all(
      objectives
        .map(objective => {
          if (objective.type === 'OpenChannel') return this.store.approveObjective(objective);
          else return;
        })
        .filter(x => x !== undefined)
    );

    const {outbox, channelResults} = await this.takeActions(channelIds);

    channelResults.map(this.registerChannelWithChainService);

    return {channelResults: mergeChannelResults(channelResults), outbox: mergeOutgoing(outbox)};
  }

  async joinChannel({channelId}: JoinChannelParams): Promise<SingleChannelOutput> {
    if (!this.store.getChannel(channelId))
      throw new JoinChannel.JoinChannelError(
        JoinChannel.JoinChannelError.reasons.channelNotFound,
        channelId
      );

    // FIXME: This is just to get existing joinChannel API pattern to keep working
    const objectives = await this.store.getObjectives([channelId]);

    if (objectives.length === 0)
      throw new Error(`Could not find objective for channel ${channelId}`);

    if (objectives[0].type === 'OpenChannel') await this.store.approveObjective(objectives[0]);
    // END FIXME

    const {outbox, channelResults} = await this.takeActions([channelId]);

    // There _must_ be a single channel result (note this will change post-ledger funding,
    // where there may be multiple channel results after a joinChannel)
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

      await this.store.addObjective(
        {
          type: 'CloseChannel',
          participants: [],
          data: {targetChannelId: channelId, fundingStrategy: 'Unknown'},
        },
        tx
      );
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
    let error: Error | undefined = undefined;

    // FIXME: Only get objectives which are:
    // 1. Approved but not executed yet
    // 2. Related to one of the channels

    const objectives = (await this.store.getObjectives(channels))
      .filter(x => x !== undefined)
      .filter(o => o?.status === 'approved');

    while (objectives.length && !error) {
      const objective = objectives[0];

      if (objective == undefined) throw new Error('Got an undefined objective '); // TODO Don't want to do this but it's a bit tricky getting type inference with Array.filter

      if (objective.type !== 'OpenChannel' && objective.type !== 'CloseChannel')
        throw new Error('not implememnted');

      const channel = objective.data.targetChannelId;

      await this.store.lockApp(channel, async tx => {
        // For the moment, we are only considering directly funded app channels.
        // Thus, we can directly fetch the channel record, and immediately construct the protocol state from it.
        // In the future, we can have an App model which collects all the relevant channels for an app channel,
        // and a Ledger model which stores ledger-specific data (eg. queued requests)
        const app = await this.store.getChannel(channel, tx);

        if (!app) {
          throw new Error('Channel not found');
        }

        const setError = async (e: Error): Promise<void> => {
          error = e;
          await tx.rollback(error);
        };
        const markObjectiveAsDone = (): void => {
          objectives.shift();
          channelResults.push(ChannelState.toChannelResult(app));
        };

        const doAction = async (action: ProtocolAction): Promise<any> => {
          switch (action.type) {
            case 'SignState': {
              const {myIndex, participants, channelId} = app;
              const signedState = await this.store.signState(action.channelId, action, tx);
              createOutboxFor(channelId, myIndex, participants, {
                signedStates: [signedState],
              }).map(outgoing => outbox.push(outgoing));
              return;
            }
            case 'FundChannel':
              await this.store.addChainServiceRequest(action.channelId, 'fund', tx);
              // Note, this returns a promise. We are NOT waiting on the promise
              this.chainService.fundChannel({
                ...action,
                expectedHeld: BN.from(action.expectedHeld),
                amount: BN.from(action.amount),
              });
              return;
            case 'CompleteObjective':
              await this.store.markObjectiveAsSucceeded(objective, tx);
              markObjectiveAsDone(); // TODO: Awkward to use this for undefined and CompleteObjective
              return;
            case 'Withdraw':
              await this.store.addChainServiceRequest(action.channelId, 'withdraw', tx);
              // Note, this returns a promise. We are NOT waiting on the promise
              this.chainService.concludeAndWithdraw(app.supported ? [app.supported] : []);
              return;
            default:
              throw 'Unimplemented';
          }
        };

        const fsm = {OpenChannel: OpenChannelProtocol, CloseChannel: CloseChannelProtocol}[
          objective.type
        ];

        const nextAction = recordFunctionMetrics(
          fsm.protocol({app}),
          this.walletConfig.timingMetrics
        );

        if (!nextAction) markObjectiveAsDone();
        else {
          try {
            await doAction(nextAction);
          } catch (err) {
            logger.error({err}, 'Error handling action');
            await setError(err);
          }
        }
      });
    }

    return {outbox, error, channelResults};
  };

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
