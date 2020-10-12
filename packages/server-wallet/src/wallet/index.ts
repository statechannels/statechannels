import {deserializeAllocations} from '@statechannels/wallet-core/lib/src/serde/app-messages/deserialize';
import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  StateChannelsNotification,
  JoinChannelParams,
  CloseChannelParams,
  ChannelResult,
  GetStateParams,
  Address,
  ChannelId,
} from '@statechannels/client-api-schema';
import {
  validatePayload,
  ChannelRequest,
  Outcome,
  convertToParticipant,
  Participant,
  assetHolderAddress,
  BN,
  Zero,
  serializeMessage,
  ChannelConstants,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';
import Knex from 'knex';
import _ from 'lodash';

import {Bytes32, Uint256} from '../type-aliases';
import {Outgoing, ProtocolAction, isOutgoing} from '../protocols/actions';
import {logger} from '../logger';
import * as OpenChannelProtocol from '../protocols/open-channel';
import * as CloseChannelProtocol from '../protocols/close-channel';
import * as UpdateChannel from '../handlers/update-channel';
import * as CloseChannel from '../handlers/close-channel';
import * as JoinChannel from '../handlers/join-channel';
import * as ApproveObjective from '../handlers/approve-objective';
import * as ChannelState from '../protocols/state';
import {isWalletError} from '../errors/wallet-error';
import {timerFactory, recordFunctionMetrics, setupMetrics} from '../metrics';
import {WorkerManager} from '../utilities/workers/manager';
import {mergeChannelResults, mergeOutgoing} from '../utilities/messaging';
import {ServerWalletConfig, extractDBConfigFromServerWalletConfig, defaultConfig} from '../config';
import {
  ChainServiceInterface,
  MockChainService,
  ChainEventSubscriberInterface,
  HoldingUpdatedArg,
  AssetTransferredArg,
} from '../chain-service';
import {DBAdmin} from '../db-admin/db-admin';

import {Store, AppHandler, MissingAppHandler, ObjectiveStoredInDB} from './store';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
export type SingleChannelResult = Promise<SingleChannelMessage>;
export type MultipleChannelResult = Promise<MultipleChannelMessage>;
type SingleChannelMessage = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
  objectivesToApprove?: Omit<ObjectiveStoredInDB, 'status'>[];
};
type MultipleChannelMessage = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  objectivesToApprove?: Omit<ObjectiveStoredInDB, 'status'>[];
};
type Message = SingleChannelMessage | MultipleChannelMessage;
const isSingleChannelMessage = (message: Message): message is SingleChannelMessage =>
  'channelResult' in message;

export interface UpdateChannelFundingParams {
  channelId: ChannelId;
  token?: Address;
  amount: Uint256;
}

export type WalletInterface = {
  // App utilities
  getParticipant(): Promise<Participant | undefined>;

  // App channel management
  createChannels(args: CreateChannelParams, amountOfChannels: number): MultipleChannelResult;

  joinChannels(channelIds: ChannelId[]): MultipleChannelResult;
  updateChannel(args: UpdateChannelParams): SingleChannelResult;
  closeChannel(args: CloseChannelParams): SingleChannelResult;
  getChannels(): MultipleChannelResult;
  getState(args: GetStateParams): SingleChannelResult;
  syncChannel(args: SyncChannelParams): SingleChannelResult;

  updateFundingForChannels(args: UpdateChannelFundingParams[]): MultipleChannelResult;
  // Wallet <-> Wallet communication
  pushMessage(m: unknown): MultipleChannelResult;

  // Wallet -> App communication
  onNotification(cb: (notice: StateChannelsNotification) => void): {unsubscribe: () => void};

  mergeMessages(messages: Message[]): MultipleChannelMessage;
};

export class Wallet implements WalletInterface, ChainEventSubscriberInterface {
  manager: WorkerManager;
  knex: Knex;
  store: Store;
  chainService: ChainServiceInterface;
  readonly walletConfig: ServerWalletConfig;
  constructor(walletConfig?: ServerWalletConfig) {
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
    this.destroy = this.destroy.bind(this);

    // set up timing metrics
    if (this.walletConfig.timingMetrics) {
      if (!this.walletConfig.metricsOutputFile) {
        throw Error('You must define a metrics output file');
      }
      setupMetrics(this.walletConfig.metricsOutputFile);
    }

    this.chainService = new MockChainService();
  }

  public mergeMessages(messages: Message[]): MultipleChannelMessage {
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
  }

  public async syncChannel({channelId}: SyncChannelParams): SingleChannelResult {
    const {states, channelState} = await this.store.getStates(channelId);

    const {participants, myIndex} = channelState;

    const peers = participants.map(p => p.participantId).filter((_, idx) => idx !== myIndex);
    const sender = participants[myIndex].participantId;

    return {
      outbox: peers.map(recipient => ({
        method: 'MessageQueued',
        params: serializeMessage(
          {
            signedStates: states,
            requests: [{type: 'GetChannel', channelId}],
          },
          recipient,
          sender,
          channelId
        ),
      })),
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

  public async updateFundingForChannels(args: UpdateChannelFundingParams[]): MultipleChannelResult {
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
  }: UpdateChannelFundingParams): SingleChannelResult {
    const assetHolder = assetHolderAddress(token || Zero) || ETH_ASSET_HOLDER_ADDRESS;

    await this.store.updateFunding(channelId, BN.from(amount), assetHolder);

    const {channelResults, outbox} = await this.takeActions([channelId]);

    return {outbox, channelResult: channelResults[0]};
  }

  public async getSigningAddress(): Promise<string> {
    return await this.store.getOrCreateSigningAddress();
  }

  async createChannel(args: CreateChannelParams): MultipleChannelResult {
    return this.createChannels(args, 1);
  }
  async createChannels(args: CreateChannelParams, amountOfChannels: number): MultipleChannelResult {
    const {participants, appDefinition, appData, allocations, fundingStrategy} = args;
    const outcome: Outcome = deserializeAllocations(allocations);
    const results = await Promise.all(
      _.range(amountOfChannels).map(async () => {
        const channelNonce = await this.store.nextNonce(participants.map(p => p.signingAddress));
        const constants: ChannelConstants = {
          channelNonce,
          participants: participants.map(convertToParticipant),
          chainId: '0x01',
          challengeDuration: 9001,
          appDefinition,
        };
        return this.store.createChannel(constants, appData, outcome, fundingStrategy);
      })
    );
    const channelResults = results.map(r => r.channelResult);
    const outgoing = results.map(r => r.outgoing).reduce((p, c) => p.concat(c));
    return {
      channelResults: mergeChannelResults(channelResults),
      outbox: mergeOutgoing(outgoing.map(n => n.notice)),
    };
  }

  async createChannelInternal(
    args: CreateChannelParams,
    channelNonce: number
  ): SingleChannelResult {
    const {participants, appDefinition, appData, allocations, fundingStrategy} = args;
    const outcome: Outcome = deserializeAllocations(allocations);

    const constants: ChannelConstants = {
      channelNonce,
      participants: participants.map(convertToParticipant),
      chainId: '0x01',
      challengeDuration: 9001,
      appDefinition,
    };

    const {outgoing, channelResult} = await this.store.createChannel(
      constants,
      appData,
      outcome,
      fundingStrategy
    );
    return {outbox: mergeOutgoing(outgoing.map(n => n.notice)), channelResult};
  }

  async joinChannels(channelIds: ChannelId[]): MultipleChannelResult {
    const results = await Promise.all(channelIds.map(channelId => this.joinChannel({channelId})));

    const channelResults = results.map(r => r.channelResult);
    const outgoing = results.map(r => r.outbox).reduce((p, c) => p.concat(c));

    return {
      channelResults: mergeChannelResults(channelResults),
      outbox: mergeOutgoing(outgoing),
    };
  }

  async approveObjective(objectiveId: number): SingleChannelResult {
    const objective = this.store.objectives[objectiveId];

    if (!objective)
      throw new ApproveObjective.ApproveObjectiveError(
        ApproveObjective.ApproveObjectiveError.reasons.objectiveNotFound,
        {objectiveId}
      );

    if (objective.type !== 'OpenChannel')
      throw new ApproveObjective.ApproveObjectiveError(
        ApproveObjective.ApproveObjectiveError.reasons.unimplemented,
        {type: objective.type}
      );

    // FIXME: This should probably be done within the critical code of the joinChannel
    this.store.objectives[objectiveId].status = 'approved';

    const {
      data: {targetChannelId},
    } = objective;

    return this.joinChannel({channelId: targetChannelId});
  }

  async joinChannel({channelId}: JoinChannelParams): SingleChannelResult {
    const criticalCode: AppHandler<SingleChannelResult> = async (tx, channel) => {
      const nextState = getOrThrow(JoinChannel.joinChannel({channelId}, channel));
      const {outgoing, channelResult} = await this.store.signState(channelId, nextState, tx);
      return {outbox: outgoing.map(n => n.notice), channelResult};
    };

    const handleMissingChannel: MissingAppHandler<SingleChannelResult> = () => {
      throw new JoinChannel.JoinChannelError(JoinChannel.JoinChannelError.reasons.channelNotFound, {
        channelId,
      });
    };

    // FIXME: This is just to get existing joinChannel API pattern to keep working
    /* eslint-disable-next-line */
    const {objectiveId} = _.find(
      this.store.objectives,
      o => o.type === 'OpenChannel' && o.data.targetChannelId === channelId
    )!;
    this.store.objectives[objectiveId].status = 'approved';
    // END FIXME

    const {outbox, channelResult} = await this.store.lockApp(
      channelId,
      criticalCode,
      handleMissingChannel
    );
    const {outbox: nextOutbox, channelResults} = await this.takeActions([channelId]);
    const nextChannelResult = channelResults.find(c => c.channelId === channelId) || channelResult;

    return {
      outbox: mergeOutgoing(outbox.concat(nextOutbox)),
      channelResult: nextChannelResult,
    };
  }

  async updateChannel(args: UpdateChannelParams): SingleChannelResult {
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
  }: UpdateChannelParams): SingleChannelResult {
    const timer = timerFactory(this.walletConfig.timingMetrics, `updateChannel ${channelId}`);
    const handleMissingChannel: MissingAppHandler<SingleChannelResult> = () => {
      throw new UpdateChannel.UpdateChannelError(
        UpdateChannel.UpdateChannelError.reasons.channelNotFound,
        {channelId}
      );
    };
    const criticalCode: AppHandler<SingleChannelResult> = async (tx, channel) => {
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
      const {outgoing, channelResult} = await timer('signing state', async () =>
        this.store.signState(channelId, nextState, tx)
      );

      return {outbox: mergeOutgoing(outgoing.map(n => n.notice)), channelResult};
    };

    return this.store.lockApp(channelId, criticalCode, handleMissingChannel);
  }

  async closeChannel({channelId}: CloseChannelParams): SingleChannelResult {
    const handleMissingChannel: MissingAppHandler<SingleChannelResult> = () => {
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

      this.store.objectives[channel.latest.channelNonce] = {
        type: 'CloseChannel',
        data: {targetChannelId: channelId},
        participants: [],
        status: 'approved',
        objectiveId: channel.latest.channelNonce,
      };
    };

    await this.store.lockApp(channelId, criticalCode, handleMissingChannel);

    const {channelResults, outbox} = await this.takeActions([channelId]);

    return {outbox, channelResult: channelResults[0]};
  }

  async getChannels(): MultipleChannelResult {
    const channelStates = await this.store.getChannels();
    return {
      channelResults: mergeChannelResults(channelStates.map(ChannelState.toChannelResult)),
      outbox: [],
    };
  }

  async getState({channelId}: GetStateParams): SingleChannelResult {
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

  async pushMessage(rawPayload: unknown): MultipleChannelResult {
    if (this.walletConfig.workerThreadAmount > 0) {
      return this.manager.pushMessage(rawPayload);
    } else {
      return this.pushMessageInternal(rawPayload);
    }
  }

  // The internal implementation of pushMessage responsible for actually pushing the message into the wallet
  async pushMessageInternal(rawPayload: unknown): MultipleChannelResult {
    const store = this.store;

    const wirePayload = validatePayload(rawPayload);

    // TODO: Move into utility somewhere?
    function handleRequest(outbox: Outgoing[]): (req: ChannelRequest) => Promise<void> {
      return async ({channelId}: ChannelRequest): Promise<void> => {
        const {states: signedStates, channelState} = await store.getStates(channelId);

        const {participants, myIndex} = channelState;

        const peers = participants.map(p => p.participantId).filter((_, idx) => idx !== myIndex);
        const {participantId: sender} = participants[myIndex];

        peers.map(recipient => {
          outbox.push({
            method: 'MessageQueued',
            params: serializeMessage({signedStates}, recipient, sender, channelId),
          });
        });
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

  onNotification(_cb: (notice: StateChannelsNotification) => void): {unsubscribe: () => void} {
    throw 'Unimplemented';
  }

  takeActions = async (channels: Bytes32[]): Promise<ExecutionResult> => {
    const outbox: Outgoing[] = [];
    const channelResults: ChannelResult[] = [];
    let error: Error | undefined = undefined;

    // FIXME: Only get objectives which are:
    // 1. Approved but not executed yet
    // 2. Related to one of the channels
    const objectives = Object.values(this.store.objectives).filter(
      objective =>
        // Only supports these two
        (objective.type === 'OpenChannel' || objective.type === 'CloseChannel') &&
        // Only runs on those with relevant channels
        _.includes(channels, objective.data.targetChannelId) &&
        // Only runs on pending or approved
        (objective.status === 'approved' || // Need approved b.c. next action to take
          objective.status === 'pending') /* Need pending because you want new channel result */
    );

    while (objectives.length && !error) {
      const objective = objectives[0];

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
              const {outgoing} = await this.store.signState(action.channelId, action, tx);
              outgoing.map(n => outbox.push(n.notice));
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
              this.store.objectives[objective.objectiveId].status = 'succeeded';
              markObjectiveAsDone(); // TODO: Awkward to use this for undefined and CompleteObjective
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
        else if (isOutgoing(nextAction)) {
          outbox.push(nextAction.notice);
          markObjectiveAsDone();
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

    return {outbox, error, channelResults};
  };

  // ChainEventSubscriberInterface implementation
  onHoldingUpdated(arg: HoldingUpdatedArg): void {
    // note: updateChannelFunding is an async function.
    // todo: this returns a Promise<SingleChannelResult>. How should the SingleChannelResult get relayed to the application?
    this.updateChannelFunding({
      ...arg,
      token: arg.assetHolderAddress,
    });
  }

  dbAdmin(): DBAdmin {
    return new DBAdmin(this.knex);
  }

  onAssetTransferred(_arg: AssetTransferredArg): void {
    // todo: implement me
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
