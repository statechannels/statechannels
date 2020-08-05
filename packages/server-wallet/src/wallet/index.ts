import {deserializeAllocations} from '@statechannels/wallet-core/lib/src/serde/app-messages/deserialize';
import {
  UpdateChannelParams,
  CreateChannelParams,
  StateChannelsNotification,
  JoinChannelParams,
  CloseChannelParams,
  ChannelResult,
  GetStateParams,
} from '@statechannels/client-api-schema';
import {
  ChannelConstants,
  Message,
  Outcome,
  SignedStateVarsWithHash,
  convertToParticipant,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';

import {Bytes32} from '../type-aliases';
import {Channel} from '../models/channel';
import {Nonce} from '../models/nonce';
import {Outgoing, ProtocolAction, isOutgoing} from '../protocols/actions';
import {SigningWallet} from '../models/signing-wallet';
import {logger} from '../logger';
import * as Application from '../protocols/application';
import * as UpdateChannel from '../handlers/update-channel';
import * as JoinChannel from '../handlers/join-channel';
import * as ChannelState from '../protocols/state';

import {Store, AppHandler, MissingAppHandler} from './store';

export {CreateChannelParams};

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
type SingleChannelResult = Promise<{outbox: Outgoing[]; channelResult: ChannelResult}>;
type MultipleChannelResult = Promise<{outbox: Outgoing[]; channelResults: ChannelResult[]}>;

export type WalletInterface = {
  // App channel management
  createChannel(args: CreateChannelParams): SingleChannelResult;
  joinChannel(args: JoinChannelParams): SingleChannelResult;
  updateChannel(args: UpdateChannelParams): SingleChannelResult;
  closeChannel(args: CloseChannelParams): SingleChannelResult;
  getChannels(): MultipleChannelResult;
  getState(args: GetStateParams): SingleChannelResult;

  // Wallet <-> Wallet communication
  pushMessage(m: Message): MultipleChannelResult;

  // Wallet -> App communication
  onNotification(cb: (notice: StateChannelsNotification) => void): {unsubscribe: () => void};
};

export class Wallet implements WalletInterface {
  async createChannel(args: CreateChannelParams): SingleChannelResult {
    return Channel.transaction(async tx => {
      const {participants, appDefinition, appData, allocations} = args;
      const outcome: Outcome = deserializeAllocations(allocations);
      // TODO: How do we pick a signing address?
      const signingAddress = (await SigningWallet.query().first())?.address;

      const channelConstants: ChannelConstants = {
        channelNonce: await Nonce.next(participants.map(p => p.signingAddress)),
        participants: participants.map(convertToParticipant),
        chainId: '0x01',
        challengeDuration: 9001,
        appDefinition,
      };

      const vars: SignedStateVarsWithHash[] = [];

      const cols = {...channelConstants, vars, signingAddress};

      const {channelId} = await Channel.query(tx).insert(cols);

      const {outgoing, channelResult} = await Store.signState(
        channelId,
        {...channelConstants, turnNum: 0, isFinal: false, appData, outcome},
        tx
      );

      return {outbox: outgoing.map(n => n.notice), channelResult};
    });
  }

  async joinChannel({channelId}: JoinChannelParams): SingleChannelResult {
    const criticalCode: AppHandler<SingleChannelResult> = async (tx, channel) => {
      const nextState = getOrThrow(JoinChannel.joinChannel({channelId}, channel));
      const {outgoing, channelResult} = await Store.signState(channelId, nextState, tx);
      return {outbox: outgoing.map(n => n.notice), channelResult};
    };

    const handleMissingChannel: MissingAppHandler<SingleChannelResult> = () => {
      throw new JoinChannel.JoinChannelError(JoinChannel.JoinChannelError.reasons.channelNotFound, {
        channelId,
      });
    };

    const {outbox, channelResult} = await Store.lockApp(
      channelId,
      criticalCode,
      handleMissingChannel
    );
    const {outbox: nextOutbox, channelResults} = await takeActions([channelId]);
    const nextChannelResult = channelResults.find(c => c.channelId === channelId) || channelResult;

    return {outbox: outbox.concat(nextOutbox), channelResult: nextChannelResult};
  }

  async updateChannel({channelId, allocations, appData}: UpdateChannelParams): SingleChannelResult {
    const handleMissingChannel: MissingAppHandler<SingleChannelResult> = () => {
      throw new UpdateChannel.UpdateChannelError(
        UpdateChannel.UpdateChannelError.reasons.channelNotFound,
        {channelId}
      );
    };
    const criticalCode: AppHandler<SingleChannelResult> = async (tx, channel) => {
      const outcome = deserializeAllocations(allocations);

      const nextState = getOrThrow(
        UpdateChannel.updateChannel({channelId, appData, outcome}, channel)
      );
      const {outgoing, channelResult} = await Store.signState(channelId, nextState, tx);

      return {outbox: outgoing.map(n => n.notice), channelResult};
    };

    return Store.lockApp(channelId, criticalCode, handleMissingChannel);
  }

  async closeChannel(_args: CloseChannelParams): SingleChannelResult {
    throw 'Unimplemented';
  }

  async getChannels(): MultipleChannelResult {
    const channelStates = await Store.getChannels();
    return {
      channelResults: channelStates.map(ChannelState.toChannelResult),
      outbox: [],
    };
  }

  async getState({channelId}: GetStateParams): SingleChannelResult {
    try {
      const {channelResult} = await Channel.query()
        .where({channelId})
        .first();

      return {
        channelResult,
        outbox: [],
      };
    } catch (err) {
      logger.error({err}, 'Could not get channel');
      throw err; // FIXME: Wallet shoudl return ChannelNotFound
    }
  }

  async pushMessage(message: Message): MultipleChannelResult {
    const channelIds = await Channel.transaction(async tx => {
      return await Store.pushMessage(message, tx);
    });

    const {channelResults, outbox} = await takeActions(channelIds);

    return {outbox, channelResults};
  }
  onNotification(_cb: (notice: StateChannelsNotification) => void): {unsubscribe: () => void} {
    throw 'Unimplemented';
  }
}

type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  error?: any;
};

const takeActions = async (channels: Bytes32[]): Promise<ExecutionResult> => {
  const outbox: Outgoing[] = [];
  const channelResults: ChannelResult[] = [];
  let error: Error | undefined = undefined;
  while (channels.length && !error) {
    await Store.lockApp(channels[0], async tx => {
      const setError = async (e: Error): Promise<void> => {
        error = e;
        await tx.rollback(error);
      };
      const markChannelAsDone = (): void => {
        channels.shift();
      };

      const doAction = async (action: ProtocolAction): Promise<any> => {
        switch (action.type) {
          case 'SignState': {
            const {outgoing, channelResult} = await Store.signState(action.channelId, action, tx);
            outgoing.map(n => outbox.push(n.notice));
            channelResults.push(channelResult);
            return;
          }
          default:
            throw 'Unimplemented';
        }
      };

      // For the moment, we are only considering directly funded app channels.
      // Thus, we can directly fetch the channel record, and immediately construct the protocol state from it.
      // In the future, we can have an App model which collects all the relevant channels for an app channel,
      // and a Ledger model which stores ledger-specific data (eg. queued requests)
      const app = await Store.getChannel(channels[0], tx);

      if (!app) {
        throw new Error('Channel not found');
      }

      const nextAction = Application.protocol({app});

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

// TODO: This should be removed, and not used externally.
// It is a fill-in until the wallet API is specced out.
export function getOrThrow<E, T>(result: Either.Either<E, T>): T {
  return Either.getOrElseW<E, T>(
    (err: E): T => {
      throw err;
    }
  )(result);
}
