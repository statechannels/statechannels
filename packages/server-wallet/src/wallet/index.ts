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
  ChannelConstants,
  validatePayload,
  ChannelRequest,
  Outcome,
  SignedStateVarsWithHash,
  convertToParticipant,
  Participant,
  assetHolderAddress,
  BN,
  Zero,
  SignedState,
  serializeMessage,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';
import Knex from 'knex';
import {Transaction} from 'objection';

import {Bytes32, Uint256} from '../type-aliases';
import {Channel} from '../models/channel';
import {Nonce} from '../models/nonce';
import {Outgoing, ProtocolAction, isOutgoing} from '../protocols/actions';
import {SigningWallet} from '../models/signing-wallet';
import {logger} from '../logger';
import * as Application from '../protocols/application';
import * as UpdateChannel from '../handlers/update-channel';
import * as CloseChannel from '../handlers/close-channel';
import * as JoinChannel from '../handlers/join-channel';
import * as ChannelState from '../protocols/state';
import {isWalletError} from '../errors/wallet-error';
import {Funding} from '../models/funding';
import {OnchainServiceInterface} from '../onchain-service';
import {timerFactory, recordFunctionMetrics, setupMetrics} from '../metrics';
import {ServerWalletConfig, extractDBConfigFromServerWalletConfig} from '../config';
import {OnchainService} from '../mock-chain-service';

import {Store, AppHandler, MissingAppHandler} from './store';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
type SingleChannelResult = Promise<{outbox: Outgoing[]; channelResult: ChannelResult}>;
type MultipleChannelResult = Promise<{outbox: Outgoing[]; channelResults: ChannelResult[]}>;

export interface UpdateChannelFundingParams {
  channelId: ChannelId;
  token?: Address;
  amount: Uint256;
}

export type WalletInterface = {
  // App utilities
  getParticipant(): Promise<Participant | undefined>;

  // App channel management
  createChannel(args: CreateChannelParams): SingleChannelResult;
  joinChannel(args: JoinChannelParams): SingleChannelResult;
  updateChannel(args: UpdateChannelParams): SingleChannelResult;
  closeChannel(args: CloseChannelParams): SingleChannelResult;
  getChannels(): MultipleChannelResult;
  getState(args: GetStateParams): SingleChannelResult;
  syncChannel(args: SyncChannelParams): SingleChannelResult;

  updateChannelFunding(args: UpdateChannelFundingParams): void;

  // Wallet <-> Wallet communication
  pushMessage(m: unknown): MultipleChannelResult;

  // Wallet -> App communication
  onNotification(cb: (notice: StateChannelsNotification) => void): {unsubscribe: () => void};

  // Register chain <-> Wallet communication
  attachChainService(provider: OnchainServiceInterface): void;
};

export class Wallet implements WalletInterface {
  store: Store;

  constructor(readonly walletConfig: ServerWalletConfig) {
    this.store = new Store(
      extractDBConfigFromServerWalletConfig(walletConfig),
      walletConfig.timingMetrics,
      walletConfig.skipEvmValidation
    );

    // Bind methods to class instance
    this.getParticipant = this.getParticipant.bind(this);
    this.updateChannelFunding = this.updateChannelFunding.bind(this);
    this.getSigningAddress = this.getSigningAddress.bind(this);
    this.createChannel = this.createChannel.bind(this);
    this.joinChannel = this.joinChannel.bind(this);
    this.updateChannel = this.updateChannel.bind(this);
    this.closeChannel = this.closeChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getState = this.getState.bind(this);
    this.pushMessage = this.pushMessage.bind(this);
    this.takeActions = this.takeActions.bind(this);

    // set up timing metrics
    if (walletConfig.timingMetrics) {
      if (!walletConfig.metricsOutputFile) {
        throw Error('You must define a metrics output file');
      }
      setupMetrics(this.knex, walletConfig.metricsOutputFile);
    }
  }

  public get knex(): Knex {
    // FIXME: Knex should be an implementation detail of a Store
    return this.store.knex;
  }

  public async destroy(): Promise<void> {
    await this.knex.destroy();
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
          sender
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

  public async updateChannelFunding({
    channelId,
    token,
    amount,
  }: UpdateChannelFundingParams): SingleChannelResult {
    const assetHolder = assetHolderAddress(token || Zero) || ETH_ASSET_HOLDER_ADDRESS;

    await Funding.updateFunding(this.knex, channelId, BN.from(amount), assetHolder);

    const {channelResults, outbox} = await this.takeActions([channelId]);

    return {outbox, channelResult: channelResults[0]};
  }

  public async getSigningAddress(): Promise<string> {
    return await this.store.getOrCreateSigningAddress(this.knex);
  }

  async createChannel(args: CreateChannelParams): SingleChannelResult {
    const {participants, appDefinition, appData, allocations} = args;
    const outcome: Outcome = deserializeAllocations(allocations);

    const channelNonce = await Nonce.next(
      this.knex,
      participants.map(p => p.signingAddress)
    );
    const channelConstants: ChannelConstants = {
      channelNonce,
      participants: participants.map(convertToParticipant),
      chainId: '0x01',
      challengeDuration: 9001,
      appDefinition,
    };

    const vars: SignedStateVarsWithHash[] = [];

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const callback = async (tx: Transaction) => {
      // TODO: How do we pick a signing address?
      const signingAddress = (await SigningWallet.query(tx).first())?.address;

      const cols = {
        ...channelConstants,
        vars,
        signingAddress,
        chainServiceRequests: [],
        fundingStrategy: args.fundingStrategy,
      };

      const channel = await Channel.query(tx)
        .insert(cols)
        .returning('*');

      const {outgoing, channelResult} = await this.store.signState(
        channel.channelId,
        {
          ...channelConstants,
          turnNum: 0,
          isFinal: false,
          appData,
          outcome,
        },
        tx
      );

      // todo: clean up the construction of the Objective
      // todo: do not assume Direct funding
      const outbox: Outgoing[] = outgoing.map(n => {
        const params = n.notice.params as {
          sender: string;
          recipient: string;
          data: {signedStates: SignedState[]};
        };
        return {
          method: 'MessageQueued' as const,
          params: {
            ...n.notice.params,
            data: {
              objectives: [
                {
                  participants,
                  type: 'CreateChannel',
                  data: {
                    signedState: params.data.signedStates[0],
                    fundingStrategy: 'Direct',
                  },
                },
              ],
            },
          },
        };
      });

      return {outbox, channelResult};
    };
    return this.knex.transaction(callback);
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

    const {outbox, channelResult} = await this.store.lockApp(
      this.knex,
      channelId,
      criticalCode,
      handleMissingChannel
    );
    const {outbox: nextOutbox, channelResults} = await this.takeActions([channelId]);
    const nextChannelResult = channelResults.find(c => c.channelId === channelId) || channelResult;

    return {outbox: outbox.concat(nextOutbox), channelResult: nextChannelResult};
  }

  async updateChannel({channelId, allocations, appData}: UpdateChannelParams): SingleChannelResult {
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

      return {outbox: outgoing.map(n => n.notice), channelResult};
    };

    return this.store.lockApp(this.knex, channelId, criticalCode, handleMissingChannel);
  }

  async closeChannel({channelId}: CloseChannelParams): SingleChannelResult {
    const handleMissingChannel: MissingAppHandler<SingleChannelResult> = () => {
      throw new CloseChannel.CloseChannelError(
        CloseChannel.CloseChannelError.reasons.channelMissing,
        {channelId}
      );
    };
    const criticalCode: AppHandler<SingleChannelResult> = async (tx, channel) => {
      const nextState = getOrThrow(CloseChannel.closeChannel(channel));
      const {outgoing, channelResult} = await this.store.signState(channelId, nextState, tx);

      return {outbox: outgoing.map(n => n.notice), channelResult};
    };

    return this.store.lockApp(this.knex, channelId, criticalCode, handleMissingChannel);
  }

  async getChannels(): MultipleChannelResult {
    const channelStates = await this.store.getChannels(this.knex);
    return {
      channelResults: channelStates.map(ChannelState.toChannelResult),
      outbox: [],
    };
  }

  async getState({channelId}: GetStateParams): SingleChannelResult {
    try {
      const {channelResult} = await Channel.forId(channelId, this.knex);

      return {
        channelResult,
        outbox: [],
      };
    } catch (err) {
      logger.error({err}, 'Could not get channel');
      throw err; // FIXME: Wallet shoudl return ChannelNotFound
    }
  }

  async pushMessage(rawPayload: unknown): MultipleChannelResult {
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
            params: serializeMessage({signedStates}, recipient, sender),
          });
        });
      };
    }

    const channelIds = await Channel.transaction(this.knex, async tx => {
      return await this.store.pushMessage(wirePayload, tx);
    });

    const {channelResults, outbox} = await this.takeActions(channelIds);

    if (wirePayload.requests && wirePayload.requests.length > 0)
      // Modifies outbox, may append new messages
      await Promise.all(wirePayload.requests.map(handleRequest(outbox)));

    return {outbox, channelResults};
  }

  onNotification(_cb: (notice: StateChannelsNotification) => void): {unsubscribe: () => void} {
    throw 'Unimplemented';
  }

  // Should be called after wallet creation
  attachChainService(provider: OnchainServiceInterface): void {
    provider.attachChannelWallet(this);
  }

  takeActions = async (channels: Bytes32[]): Promise<ExecutionResult> => {
    const outbox: Outgoing[] = [];
    const channelResults: ChannelResult[] = [];
    let error: Error | undefined = undefined;
    while (channels.length && !error) {
      await this.store.lockApp(this.knex, channels[0], async tx => {
        // For the moment, we are only considering directly funded app channels.
        // Thus, we can directly fetch the channel record, and immediately construct the protocol state from it.
        // In the future, we can have an App model which collects all the relevant channels for an app channel,
        // and a Ledger model which stores ledger-specific data (eg. queued requests)
        const app = await this.store.getChannel(channels[0], tx);

        if (!app) {
          throw new Error('Channel not found');
        }

        const setError = async (e: Error): Promise<void> => {
          error = e;
          await tx.rollback(error);
        };
        const markChannelAsDone = (): void => {
          channels.shift();
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
              await OnchainService.fundChannel(action);
              return;
            default:
              throw 'Unimplemented';
          }
        };

        const nextAction = recordFunctionMetrics(
          Application.protocol({app}),
          this.walletConfig.timingMetrics
        );

        if (!nextAction) markChannelAsDone();
        else if (isOutgoing(nextAction)) {
          outbox.push(nextAction.notice);
          markChannelAsDone();
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
