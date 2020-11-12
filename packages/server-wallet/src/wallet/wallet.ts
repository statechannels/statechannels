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
} from '@statechannels/client-api-schema';
import {
  deserializeAllocations,
  validatePayload,
  Outcome,
  convertToParticipant,
  Participant,
  BN,
  assetHolderAddress as getAssetHolderAddress,
  Zero,
  makeAddress,
  Address as CoreAddress,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import Knex from 'knex';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import {ethers} from 'ethers';
import {Logger} from 'pino';
import {Payload as WirePayload} from '@statechannels/wire-format';

import {Bytes32, Uint256} from '../type-aliases';
import {Outgoing} from '../protocols/actions';
import {createLogger} from '../logger';
import * as ProcessLedgerQueue from '../protocols/process-ledger-queue';
import * as UpdateChannel from '../handlers/update-channel';
import * as CloseChannel from '../handlers/close-channel';
import * as JoinChannel from '../handlers/join-channel';
import * as ChannelState from '../protocols/state';
import {isWalletError, PushMessageError} from '../errors/wallet-error';
import {timerFactory, recordFunctionMetrics, setupMetrics} from '../metrics';
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
import {LedgerRequest} from '../models/ledger-request';
import {WALLET_VERSION} from '../version';
import {ObjectiveManager} from '../objectives';
import {hasSupportedState, isMyTurn} from '../handlers/helpers';

import {Store, AppHandler, MissingAppHandler} from './store';
import {WalletInterface} from './types';
import {WalletResponse} from './response-builder';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
export type SingleChannelOutput = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
};
export type MultipleChannelOutput = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
};
export type Message = SingleChannelOutput | MultipleChannelOutput;

type ChannelUpdatedEventName = 'channelUpdated';
type ObjectiveSucceededEventName = 'objectiveSucceeded';
type ChannelUpdatedEvent = {
  type: ChannelUpdatedEventName;
  value: SingleChannelOutput;
};
export type ObjectiveSucceededValue = {
  channelId: string;
  objectiveType: 'OpenChannel' | 'CloseChannel';
};
type ObjectiveSucceededEvent = {
  type: ObjectiveSucceededEventName;
  value: ObjectiveSucceededValue;
};
export type WalletEvent = ChannelUpdatedEvent | ObjectiveSucceededEvent;
type EventEmitterType =
  | {
      [key in ChannelUpdatedEvent['type']]: ChannelUpdatedEvent['value'];
    }
  | {
      [key in ObjectiveSucceededEvent['type']]: ObjectiveSucceededEvent['value'];
    };

const isSingleChannelMessage = (message: Message): message is SingleChannelOutput =>
  'channelResult' in message;

export interface UpdateChannelFundingParams {
  channelId: ChannelId;
  token?: Address;
  amount: Uint256;
}

export class SingleThreadedWallet extends EventEmitter<EventEmitterType>
  implements WalletInterface, ChainEventSubscriberInterface {
  knex: Knex;
  store: Store;
  chainService: ChainServiceInterface;
  objectiveManager: ObjectiveManager;
  logger: Logger;

  readonly walletConfig: ServerWalletConfig;

  public static create(walletConfig?: ServerWalletConfig): SingleThreadedWallet {
    return new SingleThreadedWallet(walletConfig);
  }

  // protected constructor to force consumers to initialize wallet via Wallet.create(..)
  protected constructor(walletConfig?: ServerWalletConfig) {
    super();
    this.walletConfig = walletConfig || defaultConfig;
    this.knex = Knex(extractDBConfigFromServerWalletConfig(this.walletConfig));
    this.logger = createLogger({...this.walletConfig});
    this.store = new Store(
      this.knex,
      this.walletConfig.timingMetrics,
      this.walletConfig.skipEvmValidation,
      this.walletConfig.chainNetworkID,
      this.logger
    );

    // set up timing metrics
    if (this.walletConfig.timingMetrics) {
      if (!this.walletConfig.metricsOutputFile) {
        throw Error('You must define a metrics output file');
      }
      setupMetrics(this.walletConfig.metricsOutputFile);
    }

    if (walletConfig?.rpcEndpoint && walletConfig.ethereumPrivateKey) {
      this.chainService = new ChainService(
        walletConfig.rpcEndpoint,
        walletConfig.ethereumPrivateKey
      );
    } else {
      this.logger.debug(
        'rpcEndpoint and ethereumPrivateKey must be defined for the wallet to use chain service'
      );
      this.chainService = new MockChainService();
    }

    this.objectiveManager = ObjectiveManager.create({
      store: this.store,
      chainService: this.chainService,
      logger: this.logger,
      timingMetrics: this.walletConfig.timingMetrics,
    });
  }

  public async registerAppDefinition(appDefinition: string): Promise<void> {
    const bytecode = await this.chainService.fetchBytecode(appDefinition);
    await this.store.upsertBytecode(
      this.walletConfig.chainNetworkID,
      makeAddress(appDefinition),
      bytecode
    );
  }

  public async registerAppBytecode(appDefinition: string, bytecode: string): Promise<void> {
    return this.store.upsertBytecode(
      this.walletConfig.chainNetworkID,
      makeAddress(appDefinition),
      bytecode
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
    await this.store.destroy(); // TODO this destroys this.knex(), which seems quite unexpected
    this.chainService.destructor();
  }

  public async syncChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await Promise.all(channelIds.map(channelId => this._syncChannel(channelId, response)));

    return response.multipleChannelOutput();
  }

  public async syncChannel({channelId}: SyncChannelParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();
    await this._syncChannel(channelId, response);
    return response.singleChannelOutput();
  }

  private async _syncChannel(channelId: string, response: WalletResponse): Promise<void> {
    const {states, channelState} = await this.store.getStates(channelId);

    const {myIndex, participants} = channelState;

    states.forEach(s => response.queueState(s, myIndex, channelId));

    response.queueChannelRequest(channelId, myIndex, participants);
    response.queueChannelState(channelState);
  }

  public async getParticipant(): Promise<Participant | undefined> {
    let participant: Participant | undefined = undefined;

    try {
      participant = await this.store.getFirstParticipant();
    } catch (e) {
      if (isWalletError(e)) this.logger.error('Wallet failed to get a participant', e);
      else throw e;
    }

    return participant;
  }

  public async updateFundingForChannels(
    args: UpdateChannelFundingParams[]
  ): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await Promise.all(args.map(a => this._updateChannelFunding(a, response)));

    return response.multipleChannelOutput();
  }

  async updateChannelFunding(args: UpdateChannelFundingParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._updateChannelFunding(args, response);

    return response.singleChannelOutput();
  }

  private async _updateChannelFunding(
    {channelId, token, amount}: UpdateChannelFundingParams,
    response: WalletResponse
  ): Promise<void> {
    const assetHolderAddress = getAssetHolderAddress(token || Zero);
    await this.store.updateFunding(channelId, BN.from(amount), assetHolderAddress);

    await this.takeActions([channelId], response);
  }

  public async getSigningAddress(): Promise<CoreAddress> {
    return await this.store.getOrCreateSigningAddress();
  }

  async createLedgerChannel(
    args: Pick<CreateChannelParams, 'participants' | 'allocations'>,
    fundingStrategy: 'Direct' | 'Fake' = 'Direct'
  ): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._createChannel(
      response,
      {
        ...args,
        appDefinition: ethers.constants.AddressZero,
        appData: '0x00',
        fundingStrategy,
      },
      'ledger'
    );

    return response.singleChannelOutput();
  }

  async createChannel(args: CreateChannelParams): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._createChannel(response, args, 'app');

    return response.multipleChannelOutput();
  }

  async createChannels(
    args: CreateChannelParams,
    numberOfChannels: number
  ): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await Promise.all(
      _.range(numberOfChannels).map(() => this._createChannel(response, args, 'app'))
    );

    return response.multipleChannelOutput();
  }

  private async _createChannel(
    response: WalletResponse,
    args: CreateChannelParams,
    role: 'app' | 'ledger' = 'app'
  ): Promise<string> {
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

    const channelNonce = await this.store.nextNonce(participants.map(p => p.signingAddress));

    const constants = {
      appDefinition: makeAddress(appDefinition),
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

    response.queueState(signedState, channel.myIndex, channel.channelId);
    response.queueCreatedObjective(objective, channel.myIndex, channel.participants);
    response.queueChannelState(channel);

    this.registerChannelWithChainService(channel.channelId);

    return channel.channelId;
  }

  async joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();
    const objectives = await this.store.getObjectives(channelIds);

    await Promise.all(
      objectives.map(
        async ({type, objectiveId}) =>
          type === 'OpenChannel' && (await this.store.approveObjective(objectiveId))
      )
    );

    await this.takeActions(channelIds, response);

    channelIds.map(id => this.registerChannelWithChainService(id));

    return response.multipleChannelOutput();
  }

  async joinChannel({channelId}: JoinChannelParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();
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

    await this.takeActions([channelId], response);

    this.registerChannelWithChainService(channelId);

    // set strict=false to silently drop any ledger channel updates from channelResults
    // TODO: change api so that joinChannel returns a MultipleChannelOutput
    return response.singleChannelOutput(false);
  }

  async updateChannel({
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
      const response = WalletResponse.initialize();
      const {myIndex} = channel;

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
      response.queueState(signedState, myIndex, channelId);

      const channelState = await this.store.getChannel(channelId, tx);
      response.queueChannelState(channelState);

      return response.singleChannelOutput();
    };

    return this.store.lockApp(channelId, criticalCode, handleMissingChannel);
  }

  async closeChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    for (const channelId of channelIds) await this._closeChannel(channelId, response);

    await this.takeActions(channelIds, response);

    return response.multipleChannelOutput();
  }

  async closeChannel({channelId}: CloseChannelParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._closeChannel(channelId, response);
    await this.takeActions([channelId], response);

    return response.singleChannelOutput();
  }

  private async _closeChannel(channelId: Bytes32, response: WalletResponse): Promise<void> {
    await this.store.lockApp(
      channelId,
      async (tx, channel) => {
        if (hasSupportedState(channel) && !isMyTurn(channel))
          throw new CloseChannel.CloseChannelError(
            CloseChannel.CloseChannelError.reasons.notMyTurn
          );

        const dbObjective = await this.store.addObjective(
          {
            type: 'CloseChannel',
            participants: [],
            data: {targetChannelId: channelId, fundingStrategy: channel.fundingStrategy},
          },
          tx
        );
        // add new objective to the response
        response.queueCreatedObjective(dbObjective, channel.myIndex, channel.participants);
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
    const response = WalletResponse.initialize();

    const channelStates = await this.store.getLedgerChannels(
      assetHolderAddress,
      participants.map(convertToParticipant)
    );

    channelStates.forEach(cs => response.queueChannelState(cs));

    return response.multipleChannelOutput();
  }

  async getChannels(): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    const channelStates = await this.store.getChannels();
    channelStates.forEach(cs => response.queueChannelState(cs));

    return response.multipleChannelOutput();
  }

  async getState({channelId}: GetStateParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

    try {
      const channel = await this.store.getChannel(channelId);

      response.queueChannelState(channel);

      return response.singleChannelOutput();
    } catch (err) {
      this.logger.error({err}, 'Could not get channel');
      throw err;
    }
  }

  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    const wirePayload = validatePayload(rawPayload);

    const response = WalletResponse.initialize();

    try {
      await this._pushMessage(wirePayload, response);

      return response.multipleChannelOutput();
    } catch (e) {
      throw new PushMessageError('Error during pushMessage', {
        thisWalletVersion: WALLET_VERSION,
        payloadWalletVersion: wirePayload.walletVersion,
        cause: e,
      });
    }
  }

  async _pushMessage(wirePayload: WirePayload, response: WalletResponse): Promise<void> {
    const store = this.store;

    const {channelIds, channelResults: fromStoring} = await this.store.pushMessage(wirePayload);

    // add channelResults to response
    fromStoring.forEach(cr => response.queueChannelResult(cr));

    await this.takeActions(channelIds, response);

    for (const request of wirePayload.requests || []) {
      const channelId = request.channelId;

      const {states: signedStates, channelState} = await store.getStates(channelId);

      // add signed states to response
      signedStates.forEach(s => response.queueState(s, channelState.myIndex, channelId));
    }
  }

  takeActions = async (channels: Bytes32[], response: WalletResponse): Promise<void> => {
    let needToCrank = true;
    while (needToCrank) {
      await this.crankUntilIdle(channels, response);
      needToCrank = await this.processLedgerQueue(channels, response);
    }
  };

  private async processLedgerQueue(
    channels: Bytes32[],
    response: WalletResponse
  ): Promise<boolean> {
    let requiresAnotherCrankUponCompletion = false;

    // Fetch ledger channels related to the channels argument where related means, either:
    // - The ledger channel is in the channels array
    // - The ledger channel is funding one of the channels in the channels array
    const ledgersToProcess = _.chain(await this.store.getAllPendingLedgerRequests())
      .filter(({channelToBeFunded, ledgerChannelId}) =>
        _.some(
          channels,
          channelId => channelId === channelToBeFunded || channelId === ledgerChannelId
        )
      )
      .uniqBy('ledgerChannelId')
      .value();

    while (ledgersToProcess.length) {
      const {ledgerChannelId} = ledgersToProcess[0];

      await this.store.lockApp(ledgerChannelId, async tx => {
        const setError = async (e: Error): Promise<void> => {
          await tx.rollback(e);
        };

        const markLedgerAsProcessed = (): void => {
          ledgersToProcess.shift();
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
          response.queueChannelState(protocolState.fundingChannel);
        } else {
          try {
            switch (action.type) {
              case 'SignLedgerState': {
                const {myIndex, channelId} = protocolState.fundingChannel;

                const signedState = await this.store.signState(channelId, action.stateToSign, tx);

                response.queueState(signedState, myIndex, channelId);

                await Promise.all(
                  action.channelsNotFunded.map(
                    async c => await LedgerRequest.setRequestStatus(c, 'fund', 'failed', tx)
                  )
                );
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
            this.logger.error({err}, 'Error handling action');
            await setError(err);
          }
        }
      });
    }
    return requiresAnotherCrankUponCompletion;
  }

  // todo(tom): change function to return a value instead of mutating input args
  private async crankUntilIdle(channels: Bytes32[], response: WalletResponse): Promise<void> {
    // Fetch channels related to the channels argument where related means, either:
    // - The channel is in the channels array
    // - The channel is being funded by one of the channels in the channels array
    const ledgerRequests = await LedgerRequest.getAllPendingRequests(this.knex);
    const channelsWithRelevantPendingReqs = ledgerRequests
      .filter(req => channels.includes(req.ledgerChannelId))
      .map(req => req.channelToBeFunded);

    const objectives = (
      await this.store.getObjectives(channels.concat(channelsWithRelevantPendingReqs))
    ).filter(objective => objective.status === 'approved');

    // todo(tom): why isn't this just a for loop?
    while (objectives.length) {
      const objective = objectives[0];

      await this.objectiveManager.crank(objective.objectiveId, response);
      response.objectiveSucceededEvents().map(event => this.emit(event.type, event.value));

      // remove objective from list
      objectives.shift();
    }
  }

  // ChainEventSubscriberInterface implementation
  async holdingUpdated({channelId, amount, assetHolderAddress}: HoldingUpdatedArg): Promise<void> {
    const response = WalletResponse.initialize();

    await this.store.updateFunding(channelId, BN.from(amount), assetHolderAddress);
    await this.takeActions([channelId], response);

    response.channelUpdatedEvents().forEach(event => this.emit('channelUpdated', event.value));
  }

  async assetTransferred(arg: AssetTransferredArg): Promise<void> {
    const response = WalletResponse.initialize();
    // TODO: make sure that arg.to is checksummed
    await this.store.updateTransferredOut(
      arg.channelId,
      arg.assetHolderAddress,
      arg.to,
      arg.amount
    );
    await this.takeActions([arg.channelId], response);

    response.channelUpdatedEvents().forEach(event => this.emit('channelUpdated', event.value));
  }

  private async registerChannelWithChainService(channelId: string): Promise<void> {
    const channel = await this.store.getChannel(channelId);
    const channelResult = ChannelState.toChannelResult(channel);

    const assetHolderAddresses = channelResult.allocations.map(a => getAssetHolderAddress(a.token));
    this.chainService.registerChannel(channelId, assetHolderAddresses, this);
  }

  dbAdmin(): DBAdmin {
    return new DBAdmin(this.knex);
  }

  async warmUpThreads(): Promise<void> {
    // no-op for single-threaded-wallet
  }
}

// TODO: This should be removed, and not used externally.
// It is a fill-in until the wallet API is specced out.
export function getOrThrow<E, T>(result: Either.Either<E, T>): T {
  return Either.getOrElseW<E, T>(
    (err: E): T => {
      throw err;
    }
  )(result);
}
