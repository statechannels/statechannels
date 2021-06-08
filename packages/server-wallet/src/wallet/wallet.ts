import {ChannelResult, CreateChannelParams, Uint256} from '@statechannels/client-api-schema';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import {makeAddress, makeDestination} from '@statechannels/wallet-core';
import {providers, utils} from 'ethers';
import {setIntervalAsync, clearIntervalAsync} from 'set-interval-async/dynamic';

import {
  MessageHandler,
  MessageServiceFactory,
  MessageServiceInterface,
} from '../message-service/types';
import {getMessages} from '../message-service/utils';
import {WalletObjective} from '../models/objective';
import {
  Engine,
  hasNewObjective,
  isMultipleChannelOutput,
  MultipleChannelOutput,
  SingleChannelOutput,
} from '../engine';
import {
  AssetOutcomeUpdatedArg,
  ChainEventSubscriberInterface,
  ChainServiceInterface,
  ChallengeRegisteredArg,
  ChannelFinalizedArg,
  HoldingUpdatedArg,
} from '../chain-service';
import * as ChannelState from '../protocols/state';

import {SyncOptions, ObjectiveResult, WalletEvents, ObjectiveDoneResult} from './types';

const DEFAULTS: SyncOptions = {pollInterval: 100, timeOutThreshold: 60_000, staleThreshold: 1_000};
export class Wallet extends EventEmitter<WalletEvents> {
  /**
   * Constructs a channel manager that will ensure objectives get accomplished by resending messages if needed.
   * @param engine The engine to use.
   * @param messageService  The message service to use.
   * @param retryOptions How often and for how long the channel manager should retry objectives.
   * @returns A channel manager.
   */
  public static async create(
    engine: Engine,
    chainService: ChainServiceInterface,
    messageServiceFactory: MessageServiceFactory,
    retryOptions: Partial<SyncOptions> = DEFAULTS
  ): Promise<Wallet> {
    await chainService.checkChainId(engine.engineConfig.networkConfiguration.chainNetworkID);
    const wallet = new Wallet(messageServiceFactory, engine, chainService, {
      ...DEFAULTS,
      ...retryOptions,
    });
    await wallet.registerExistingChannelsWithChainService();
    return wallet;
  }

  private _messageService: MessageServiceInterface;

  private _syncInterval = setIntervalAsync(async () => {
    await this.syncObjectives();
  }, this._syncOptions.pollInterval);

  private _chainListener: ChainEventSubscriberInterface;
  private constructor(
    messageServiceFactory: MessageServiceFactory,
    private _engine: Engine,
    private _chainService: ChainServiceInterface,
    private _syncOptions: SyncOptions
  ) {
    super();

    const handler: MessageHandler = async message => {
      const result = await this._engine.pushMessage(message.data);
      const {channelResults, completedObjectives} = result;
      for (const o of completedObjectives) {
        if (o.type === 'CloseChannel') {
          this._engine.logger.trace({objective: o}, 'Objective completed');
          this.emit('ObjectiveCompleted', o);
        }
      }
      await this.registerChannels(channelResults);

      await this.handleEngineOutput(result);
    };

    this._messageService = messageServiceFactory(handler);

    this._chainListener = {
      holdingUpdated: this.createChainEventlistener('holdingUpdated', e =>
        this._engine.store.updateFunding(e.channelId, e.amount, e.assetHolderAddress)
      ),
      assetOutcomeUpdated: this.createChainEventlistener('assetOutcomeUpdated', async e => {
        const transferredOut = e.externalPayouts.map(ai => ({
          toAddress: makeDestination(ai.destination),
          amount: ai.amount as Uint256,
        }));

        await this._engine.store.updateTransferredOut(
          e.channelId,
          e.assetHolderAddress,
          transferredOut
        );
      }),
      challengeRegistered: this.createChainEventlistener('challengeRegistered', e =>
        this._engine.store.insertAdjudicatorStatus(e.channelId, e.finalizesAt, e.challengeStates)
      ),
      channelFinalized: this.createChainEventlistener('channelFinalized', e =>
        this._engine.store.markAdjudicatorStatusAsFinalized(
          e.channelId,
          e.blockNumber,
          e.blockTimestamp,
          e.finalizedAt
        )
      ),
    };
  }
  /**
   * Pulls and stores the ForceMoveApp definition bytecode at the supplied blockchain address.
   *
   * @remarks
   * Storing the bytecode is necessary for the engine to verify ForceMoveApp transitions.
   *
   * @param  appDefinition - An ethereum address where ForceMoveApp rules are deployed.
   * @returns A promise that resolves when the bytecode has been successfully stored.
   */
  public async registerAppDefinition(appDefinition: string): Promise<void> {
    const bytecode = await this._chainService.fetchBytecode(appDefinition);
    await this._engine.store.upsertBytecode(
      utils.hexlify(this._engine.engineConfig.networkConfiguration.chainNetworkID),
      makeAddress(appDefinition),
      bytecode
    );
  }
  /**
   * Approves an objective that has been proposed by another participant.
   * Once the objective has been approved progress can be made to completing the objective.
   * @remarks
   * This is used to "join" channels by approving a CreateChannel Objective.
   * @param objectiveIds The ids of the objective you want to approve.
   * @returns A promise that resolves to a collection of ObjectiveResult.
   */
  public async approveObjectives(objectiveIds: string[]): Promise<ObjectiveResult[]> {
    const {objectives, messages, chainRequests} = await this._engine.approveObjectives(
      objectiveIds
    );

    const results = objectives.map(async o => ({
      objectiveId: o.objectiveId,
      currentStatus: o.status,
      channelId: o.data.targetChannelId,
      done: this.createObjectiveDoneResult(o),
    }));

    // TODO: ApproveObjective should probably just return a MultipleChannelOuput
    const completedObjectives = objectives.filter(o => o.status === 'succeeded');
    completedObjectives.forEach(o => this.emit('ObjectiveCompleted', o));
    const transactions = await this._chainService.handleChainRequests(chainRequests);
    await this.messageService.send(messages);
    await Promise.all(transactions.map(tr => tr.wait()));

    return Promise.all(results);
  }

  /**
   Creates channels using the given parameters.
   * @param channelParameters The parameters to use for channel creation. A channel will be created for each entry in the array.
   * @returns A promise that resolves to a collection of ObjectiveResult.
   */
  public async createChannels(
    channelParameters: CreateChannelParams[]
  ): Promise<ObjectiveResult[]> {
    return Promise.all(
      channelParameters.map(async p => {
        try {
          const createResult = await this._engine.createChannel(p);

          await this.registerChannels([createResult.channelResult]);

          const {newObjective, channelResult} = createResult;
          const done = this.createObjectiveDoneResult(newObjective);
          await this.handleEngineOutput(createResult);
          return {
            channelId: channelResult.channelId,
            currentStatus: newObjective.status,
            objectiveId: newObjective.objectiveId,
            done,
          };
        } catch (error) {
          this._engine.logger.error({err: error}, 'Uncaught InternalError in CreateChannel');
          // TODO: This is slightly hacky but it's less painful then having to narrow the type down every time
          // you get a result back from the createChannels method
          // This should be looked at in https://github.com/statechannels/statechannels/issues/3461
          return {
            channelId: 'ERROR',
            currentStatus: 'failed' as const,
            objectiveId: 'ERROR',
            done: Promise.resolve({type: 'InternalError' as const, error}),
          };
        }
      })
    );
  }

  private async syncObjectives() {
    const staleDate = Date.now() - this._syncOptions.staleThreshold;
    const timeOutDate = Date.now() - this._syncOptions.timeOutThreshold;
    const objectives = await this._engine.store.getApprovedObjectives();
    const timedOutObjectives = objectives.filter(o => o.progressLastMadeAt.getTime() < timeOutDate);

    for (const o of timedOutObjectives) {
      this.emit('ObjectiveTimedOut', o);
    }

    const staleObjectives = objectives
      .filter(o => o.progressLastMadeAt.getTime() < staleDate)
      .map(o => o.objectiveId);

    const syncMessages = await this._engine.syncObjectives(staleObjectives);
    await this._messageService.send(syncMessages);
  }

  /**
   Closes the specified channels
   * @param channelIds The ids of the channels to close.
   * @returns A promise that resolves to a collection of ObjectiveResult.
   */
  public async closeChannels(channelIds: string[]): Promise<ObjectiveResult[]> {
    return Promise.all(
      channelIds.map(async channelId => {
        const closeResult = await this._engine.closeChannel({channelId});
        const {newObjective, channelResult} = closeResult;

        // TODO: We just refetch to get the latest status
        // Long term we should make sure the engine returns the latest objectives
        const latest = await this._engine.getObjective(newObjective.objectiveId);
        await this.handleEngineOutput(closeResult);

        return {
          channelId: channelResult.channelId,
          currentStatus: latest.status,
          objectiveId: newObjective.objectiveId,
          done: this.createObjectiveDoneResult(newObjective),
        };
      })
    );
  }

  /**
   * Finds any approved objectives and attempts to make progress on them.
   * This is useful for restarting progress after a restart or crash.
   * @returns A collection of ObjectiveResults. There will be an ObjectiveResult for each approved objective found.
   */
  public async jumpStartObjectives(): Promise<ObjectiveResult[]> {
    const objectives = await this._engine.getApprovedObjectives();
    const objectiveIds = objectives.map(o => o.objectiveId);
    await this._engine.store.updateObjectiveProgressDate(objectiveIds);

    const syncMessages = await this._engine.syncObjectives(objectiveIds);

    const results = objectives.map(async o => {
      const done = this.createObjectiveDoneResult(o);
      return {
        objectiveId: o.objectiveId,
        currentStatus: o.status,
        channelId: o.data.targetChannelId,
        done,
      };
    });

    await this.messageService.send(syncMessages);
    return Promise.all(results);
  }

  private emitObjectiveEvents(result: MultipleChannelOutput | SingleChannelOutput): void {
    if (isMultipleChannelOutput(result)) {
      // Receiving messages from other participants may have resulted in completed objectives
      for (const o of result.completedObjectives) {
        this.emit('ObjectiveCompleted', o);
      }

      // Receiving messages from other participants may have resulted in new proposed objectives
      for (const o of result.newObjectives) {
        if (o.status === 'pending') {
          this.emit('ObjectiveProposed', o);
        }
      }
    } else {
      if (hasNewObjective(result)) {
        if (result.newObjective.status === 'pending') {
          this.emit('ObjectiveProposed', result.newObjective);
        }
      }
    }
  }

  /**
   * Waits for the transactions.wait() promise to resolve on all transaction responses.
   * @param response
   */
  private async waitForTransactions(
    response: Promise<providers.TransactionResponse[]>
  ): Promise<void> {
    const transactions = await response;
    await Promise.all(transactions.map(tr => tr.wait()));
  }

  /**
   * Emits events, sends messages and requests transactions based on the output of the engine.
   * @param output
   */
  private async handleEngineOutput(
    output: MultipleChannelOutput | SingleChannelOutput
  ): Promise<void> {
    this.emitObjectiveEvents(output);
    await this._messageService.send(getMessages(output));
    await this.waitForTransactions(this._chainService.handleChainRequests(output.chainRequests));
  }

  public get messageService(): MessageServiceInterface {
    return this._messageService;
  }

  private async createObjectiveDoneResult(
    objective: WalletObjective
  ): Promise<ObjectiveDoneResult> {
    return new Promise<ObjectiveDoneResult>(resolve => {
      this.on('ObjectiveTimedOut', o => {
        if (o.objectiveId === objective.objectiveId) {
          this._engine.logger.trace({objective: o}, 'Objective Timed out');

          resolve({
            type: 'ObjectiveTimedOutError',
            objectiveId: o.objectiveId,
            lastProgressMadeAt: o.progressLastMadeAt,
          });
        }
      });
      this.on('ObjectiveCompleted', o => {
        if (o.objectiveId === objective.objectiveId) {
          this._engine.logger.trace({objective: o}, 'Objective Suceeded');
          resolve({type: 'Success', channelId: o.data.targetChannelId});
        }
      });
    });
  }

  /**
   * Registers any channels existing in the database with the chain service.
   *
   * @remarks
   * Enables the chain service to alert the engine of of any blockchain events for existing channels.
   *
   * @returns A promise that resolves when the channels have been successfully registered.
   */
  private async registerExistingChannelsWithChainService(): Promise<void> {
    const channelsToRegister = (await this._engine.store.getNonFinalizedChannels()).map(
      ChannelState.toChannelResult
    );
    await this.registerChannels(channelsToRegister);
  }

  private async registerChannels(channelsToRegister: ChannelResult[]): Promise<void> {
    const channelsWithAssetHolders = channelsToRegister.map(cr => ({
      assetHolderAddresses: cr.allocations.map(a => makeAddress(a.assetHolderAddress)),
      channelId: cr.channelId,
    }));

    for (const {channelId, assetHolderAddresses} of channelsWithAssetHolders) {
      this._chainService.registerChannel(channelId, assetHolderAddresses, this._chainListener);
    }
  }

  private createChainEventlistener<
    K extends keyof ChainEventSubscriberInterface,
    EH extends ChainEventSubscriberInterface[K]
  >(eventName: K, storeUpdater: EH) {
    return async (
      event: HoldingUpdatedArg &
        AssetOutcomeUpdatedArg &
        ChannelFinalizedArg &
        ChallengeRegisteredArg
    ) => {
      const {channelId} = event;
      this._engine.logger.trace({event}, `${eventName} being handled`);
      try {
        await storeUpdater(event);
        const result = await this._engine.crank([channelId]);
        await this.handleEngineOutput(result);
      } catch (err) {
        this._engine.logger.error({err, event}, `Error handling ${eventName}`);
        throw err;
      }
    };
  }

  async destroy(): Promise<void> {
    await clearIntervalAsync(this._syncInterval);
    this._chainService.destructor();
    await this._messageService.destroy();
    await this._engine.destroy();
  }
}
