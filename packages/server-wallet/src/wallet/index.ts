import {deserializeAllocations} from '@statechannels/wallet-core/lib/src/serde/app-messages/deserialize';
import {
  ChannelStatus,
  ChannelResult as ClientChannelResult,
  UpdateChannelParams as ClientUpdateChannelParams,
  CreateChannelParams,
  Notification,
  JoinChannelParams,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {
  ChannelConstants,
  Message,
  Outcome,
  SignedStateVarsWithHash,
  calculateChannelId,
  convertToParticipant,
  hashState,
  SignatureEntry,
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

import {handleSignState} from './actionHandlers';

// TODO: participants should be removed from ClientUpdateChannelParams
export type UpdateChannelParams = Omit<ClientUpdateChannelParams, 'participants'>;
export {ChannelStatus, CreateChannelParams};

export type AddressedMessage = Message & {to: string; from: string};

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// This is an interim type, until it does.
type WithOutbox = {outbox: Outgoing[]};
type ChannelResult = ClientChannelResult & WithOutbox;

export type WalletInterface = {
  // App channel management
  createChannel(args: CreateChannelParams): Promise<ChannelResult>;
  joinChannel(args: JoinChannelParams): Promise<ChannelResult>;
  updateChannel(args: UpdateChannelParams): Promise<ChannelResult>;
  closeChannel(args: CloseChannelParams): Promise<ChannelResult>;
  getChannels(): Promise<ChannelResult[]>;

  // Wallet <-> Wallet communication
  pushMessage(m: AddressedMessage): Promise<{response?: Message; channelResults?: ChannelResult[]}>;

  // Wallet -> App communication
  onNotification(cb: (notice: Notification) => void): {unsubscribe: () => void};
};

export class Wallet implements WalletInterface {
  async createChannel(args: CreateChannelParams): Promise<ChannelResult> {
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

    const turnNum = 0;
    const isFinal = false;
    const signatures: SignatureEntry[] = [];
    const s = {appData, outcome, turnNum, isFinal, signatures};
    const vars: SignedStateVarsWithHash[] = [
      {...s, stateHash: hashState({...channelConstants, ...s})},
    ];

    const cols = {...channelConstants, vars, signingAddress};
    const {channelId, latest} = await Channel.query().insert(cols);

    const {outbox} = await ((): Promise<ExecutionResult> => {
      return takeActions([{type: 'App', id: channelId}]);
    })();

    return {
      ...args,
      turnNum: latest.turnNum,
      status: 'funding',
      channelId,
      outbox,
    };
  }

  async joinChannel(_args: JoinChannelParams): Promise<ChannelResult> {
    throw 'Unimplemented';
  }
  async updateChannel(_args: UpdateChannelParams): Promise<ChannelResult> {
    throw 'Unimplemented';
  }
  async closeChannel(_args: CloseChannelParams): Promise<ChannelResult> {
    throw 'Unimplemented';
  }
  async getChannels(): Promise<ChannelResult[]> {
    throw 'Unimplemented';
  }

  async pushMessage(message: AddressedMessage): Promise<{channelResults?: ChannelResult[]}> {
    const channelIds: Bytes32[] = [];

    try {
      await Channel.transaction(async tx => {
        for (const ss of message.signedStates || []) {
          // We ignore unsigned states
          if (!ss.signatures?.length) return;

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
            const cols: RequiredColumns = {
              ...ss,
              vars: [addHash(ss)],
              signingAddress,
            };

            channel = Channel.fromJson(cols);
            const {channelId} = await Channel.query(tx).insert(channel);
            channelIds.push(channelId);
          } else {
            ss.signatures?.map(sig => channel.addState(ss, sig));
            await Channel.query(tx).update(channel);
            channelIds.push(channel.channelId);
          }
        }
      });
    } catch (err) {
      logger.error({err}, 'Could not push message');
      throw err;
    }

    const {outbox} = await takeActions(channelIds.map(id => ({type: 'App', id})));

    return {
      channelResults: [
        {
          outbox,
          appData: '',
          appDefinition: '',
          channelId: '',
          challengeExpirationTime: 0,
          status: 'funding',
          participants: [],
          allocations: [],
          turnNum: 0,
        },
      ],
    };
  }
  onNotification(_cb: (notice: Notification) => void): {unsubscribe: () => void} {
    throw 'Unimplemented';
  }
}

type ChangedChannel = {type: 'App' | 'Ledger'; id: Bytes32};
type ExecutionResult = {outbox: Outgoing[]; error?: any};
const takeActions = async (channels: ChangedChannel[]): Promise<ExecutionResult> => {
  const outbox: Outgoing[] = [];
  let error: Error | undefined = undefined;
  while (channels.length && !error) {
    const tx = await knex.transaction();
    // For the moment, we are only considering directly funded app channels.
    // Thus, we can directly fetch the channel record, and construct the protocol state from it.
    // In the future, we can have an App model which collects all the relevant channels for an app channel,
    // and a Ledger model which stores ledger-specific data (eg. queued requests)

    const setError = async (e: Error): Promise<void> => {
      error = e;
      await tx.rollback();
    };
    const markChannelAsDone = async (): Promise<any> => channels.shift();
    const handleAction = (action: ProtocolAction): Promise<any> => {
      switch (action.type) {
        case 'SignState':
          return handleSignState(action, tx);
        default:
          throw 'Unimplemented';
      }
    };

    const app = await Channel.forId(channels[0].id, undefined);
    const nextAction = await Application.protocol({app: app.protocolState});

    // TODO: handleAction might also throw an error.
    // It would be nice for handleAction to return an Either type, pipe the right values,
    // and handle the left values with setError
    await Either.fold(setError, Option.fold(markChannelAsDone, handleAction))(nextAction);

    await tx.commit();
  }

  return {outbox, error};
};
