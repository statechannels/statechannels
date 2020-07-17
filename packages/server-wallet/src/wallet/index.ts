import {
  Message,
  calculateChannelId,
  convertToParticipant,
  Outcome,
  SignedStateVarsWithHash,
  hashState,
  ChannelConstants,
  SignedState,
} from '@statechannels/wallet-core';
import {deserializeAllocations} from '@statechannels/wallet-core/lib/src/serde/app-messages/deserialize';

import {
  CreateChannelParams,
  UpdateChannelParams as ClientUpdateChannelParams,
  ChannelStatus,
  ChannelResult as ClientChannelResult,
  Notification,
} from '@statechannels/client-api-schema';
import {Bytes32} from '../type-aliases';
import {Channel, RequiredColumns} from '../models/channel';
import {addHash} from '../state-utils';
import {SigningWallet} from '../models/signing-wallet';
import {logger} from '../logger';
import {Nonce} from '../models/nonce';
import {executionLoop} from '../protocols/direct-funding';
import {isOutgoing, Outgoing, isInternal} from '../protocols/actions';

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
  joinChannel(channelId: Bytes32): Promise<ChannelResult>;
  updateChannel(args: UpdateChannelParams): Promise<ChannelResult>;
  closeChannel(channelId: Bytes32): Promise<ChannelResult>;
  getChannels(): Promise<ClientChannelResult[]>;

  // Wallet <-> Wallet communication
  pushMessage(m: AddressedMessage): Promise<{response?: Message; channelResults?: ChannelResult[]}>;

  // Wallet -> App communication
  onNotification(cb: (notice: Notification) => void): {unsubscribe: any};
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
    const signatures = [];
    const s = {appData, outcome, turnNum, isFinal, signatures};
    const vars: SignedStateVarsWithHash[] = [
      {...s, stateHash: hashState({...channelConstants, ...s})},
    ];

    const cols = {...channelConstants, vars, signingAddress};
    const {channelId, latest} = await Channel.query().insert(cols);

    const {outbox} = await (() => {
      switch (args.fundingStrategy) {
        case 'Direct':
          return protocolEngine([channelId]);
        case 'Ledger':
        case 'Virtual':
          throw 'Unimplemented';
      }
    })();

    return {
      ...args,
      turnNum: latest.turnNum,
      status: 'funding',
      channelId,
      outbox,
    };
  }

  async joinChannel(_channelId: Bytes32): Promise<ChannelResult> {
    throw 'Unimplemented';
  }
  async updateChannel(_args: UpdateChannelParams): Promise<ChannelResult> {
    throw 'Unimplemented';
  }
  async closeChannel(_channelId: Bytes32): Promise<ChannelResult> {
    throw 'Unimplemented';
  }
  async getChannels(): Promise<ClientChannelResult[]> {
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

    const {outbox} = await protocolEngine(channelIds);

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
  onNotification(_cb: (notice: Notification) => void): {unsubscribe: any} {
    throw 'Unimplemented';
  }
}

type ExecutionResult = {ids: Bytes32[]; outbox: Outgoing[]};
const protocolEngine = async (
  ids: Bytes32[],
  outbox: Outgoing[] = []
): Promise<ExecutionResult> => {
  if (ids.length === 0) return {ids, outbox};

  const [channelId, ...nextIds] = ids;

  const channel = await Channel.forId(channelId, undefined);
  const actions = await executionLoop(channel);
  const todos = actions.filter(isInternal);

  for (const todo of todos) {
    let state: SignedState;
    switch (todo.type) {
      case 'SignState':
        state = await channel.signState(todo.hash);
        break;
      case 'UpdateChannel':
        // channel.update(todo);
        break;
    }

    await Channel.query().update(channel);
    outbox.push({
      type: 'NotifyApp',
      notice: {
        method: 'MessageQueued',
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {signedStates: [state]},
        },
      },
    });

    // TODO: Push the channelId back, once we actually trigger these actions
    // nextIds.push(channelId);
  }

  outbox = outbox.concat(actions.filter(isOutgoing));

  if (nextIds.length) {
    return await protocolEngine(nextIds, outbox);
  } else {
    return {ids: [], outbox};
  }
};
