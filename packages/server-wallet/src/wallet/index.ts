import {deserializeAllocations} from '@statechannels/wallet-core/lib/src/serde/app-messages/deserialize';
import {
  ChannelResult as ClientChannelResult,
  UpdateChannelParams,
  CreateChannelParams,
  Notification,
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
  calculateChannelId,
  convertToParticipant,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';

import {Bytes32} from '../type-aliases';
import {Channel, RequiredColumns} from '../models/channel';
import {Nonce} from '../models/nonce';
import {Outgoing, ProtocolAction} from '../protocols/actions';
import {SigningWallet} from '../models/signing-wallet';
import {addHash} from '../state-utils';
import {logger} from '../logger';
import * as Application from '../protocols/application';
import knex from '../db/connection';
import * as UpdateChannel from '../handlers/update-channel';

import {Store} from './store';

export {CreateChannelParams};

export type AddressedMessage = Message & {to: string; from: string};

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results
type Result = Promise<{outbox: Outgoing[]; channelResults: ChannelResult[]}>;
export type WalletInterface = {
  // App channel management
  createChannel(args: CreateChannelParams): Result;
  joinChannel(args: JoinChannelParams): Result;
  updateChannel(args: UpdateChannelParams): Result;
  closeChannel(args: CloseChannelParams): Result;
  getChannels(): Result;
  getState(args: GetStateParams): Result;

  // Wallet <-> Wallet communication
  pushMessage(m: AddressedMessage): Promise<{response?: Message; outbox?: Outgoing[]}>;

  // Wallet -> App communication
  onNotification(cb: (notice: Notification) => void): {unsubscribe: () => void};
};

export class Wallet implements WalletInterface {
  async createChannel(args: CreateChannelParams): Result {
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
        {
          ...channelConstants,
          turnNum: 0,
          isFinal: false,
          appData,
          outcome,
        },
        tx
      );

      return {outbox: outgoing.map(n => n.notice), channelResults: [channelResult]};
    });
  }

  async joinChannel(_args: JoinChannelParams): Result {
    throw 'Unimplemented';
  }
  async updateChannel({channelId, allocations, appData}: UpdateChannelParams): Result {
    return knex.transaction(async tx => {
      const channel = await Store.getChannel(channelId, tx);

      if (!channel)
        throw new UpdateChannel.UpdateChannelError(
          UpdateChannel.UpdateChannelError.reasons.channelNotFound,
          {
            channelId,
          }
        );

      const outcome = deserializeAllocations(allocations);

      const nextState = getOrThrow(
        UpdateChannel.updateChannel({channelId, appData, outcome}, channel)
      );
      const {outgoing, channelResult} = await Store.signState(channelId, nextState, tx);

      return {outbox: outgoing.map(n => n.notice), channelResults: [channelResult]};
    });
  }

  async closeChannel(_args: CloseChannelParams): Result {
    throw 'Unimplemented';
  }
  async getChannels(): Result {
    throw 'Unimplemented';
  }

  async getState({channelId}: GetStateParams): Result {
    try {
      const {channelResult} = await Channel.query()
        .where({channelId})
        .first();

      return {
        channelResults: [channelResult],
        outbox: [],
      };
    } catch (err) {
      logger.error({err}, 'Could not get channel');
      throw err; // FIXME: Wallet shoudl return ChannelNotFound
    }
  }

  async pushMessage(message: AddressedMessage): Result {
    const channelIds: Bytes32[] = [];

    try {
      await Channel.transaction(async tx => {
        for (const ss of message.signedStates || []) {
          // We ignore unsigned states
          if (!ss.signatures?.length) {
            logger.info(`pushMessage received unsigned state`);
            return;
          }

          const channelId = calculateChannelId(ss);
          let channel = await Channel.query(tx)
            .where('channelId', channelId)
            .first();

          if (!channel) {
            const addresses = ss.participants.map(p => p.signingAddress);
            const signingWallet = await SigningWallet.query(tx)
              .whereIn('address', addresses)
              .first();

            if (!signingWallet) {
              logger.error(
                {
                  knownWallets: await SigningWallet.query(tx).select(),
                  addresses,
                },
                'Not in channel'
              );
              throw Error('Not in channel');
            }

            const {address: signingAddress} = signingWallet;
            const cols: RequiredColumns = {...ss, vars: [addHash(ss)], signingAddress};

            channel = Channel.fromJson(cols);

            const {channelId} = await Channel.query(tx).insert(channel);
            channelIds.push(channelId);
          } else {
            ss.signatures?.map(sig => channel.addState(ss, sig));
            await Channel.query(tx).upsertGraph(channel);
            channelIds.push(channel.channelId);
          }
        }
      });
    } catch (err) {
      logger.error({err}, 'Could not push message');
      throw err;
    }

    const {channelResults, outbox} = await takeActions(channelIds);

    return {outbox, channelResults};
  }
  onNotification(_cb: (notice: Notification) => void): {unsubscribe: () => void} {
    throw 'Unimplemented';
  }
}

type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ClientChannelResult[];
  error?: any;
};

const takeActions = async (channels: Bytes32[]): Promise<ExecutionResult> => {
  const outbox: Outgoing[] = [];
  const channelResults: ClientChannelResult[] = [];
  let error: Error | undefined = undefined;
  while (channels.length && !error) {
    const tx = await knex.transaction();

    const setError = async (e: Error): Promise<void> => {
      error = e;
      await tx.rollback();
    };
    const markChannelAsDone = async (): Promise<any> => {
      channels.shift() as string;
    };

    const handleAction = async (action: ProtocolAction): Promise<any> => {
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
    const app = await Channel.forId(channels[0], undefined);

    try {
      const nextAction = await Application.protocol({app: app.protocolState});
      // TODO: handleAction might also throw an error.
      // It would be nice for handleAction to return an Either type, pipe the right values,
      // and handle the left values with setError
      await Either.fold(setError, Option.fold(markChannelAsDone, handleAction))(nextAction);
      await tx.commit();
    } catch (err) {
      // FIXME
      logger.error({err}, 'Error handling action');
      await setError(err);
    }
  }

  return {outbox, error, channelResults};
};

// TODO: This should be removed, and not used externally.
// It is a fill-in until the wallet API is specced out.
function getOrThrow<E, T>(result: Either.Either<E, T>): T {
  return Either.getOrElseW<E, T>(
    (err: E): T => {
      throw err;
    }
  )(result);
}
