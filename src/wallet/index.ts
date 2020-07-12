import { Message, calculateChannelId } from '@statechannels/wallet-core';

import {
  CreateChannelParams,
  UpdateChannelParams as ClientUpdateChannelParams,
  ChannelStatus,
  ChannelResult as ClientChannelResult,
  Notification,
} from '@statechannels/client-api-schema';
import { Bytes32 } from '../type-aliases';
import { Channel, ChannelColumns } from '../models/channel';
import { addHash } from '../state-utils';

// TODO: participants should be removed from ClientUpdateChannelParams
export type UpdateChannelParams = Omit<
  ClientUpdateChannelParams,
  'participants'
>;
export { ChannelStatus, CreateChannelParams };

export type AddressedMessage = Message & { to: string; from: string };

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// This is an interim type, until it does.
type WithOutbox = { outbox?: AddressedMessage[] };
type ChannelResult = ClientChannelResult & WithOutbox;

export type WalletInterface = {
  // App channel management
  createChannel(args: CreateChannelParams): Promise<ChannelResult>;
  joinChannel(channelId: Bytes32): Promise<ChannelResult>;
  updateChannel(args: UpdateChannelParams): Promise<ChannelResult>;
  closeChannel(channelId: Bytes32): Promise<ChannelResult>;
  getChannels(): Promise<ClientChannelResult[]>;

  // Wallet <-> Wallet communication
  pushMessage(
    m: AddressedMessage
  ): Promise<{ response?: Message; channelResults?: ChannelResult[] }>;

  // Wallet -> App communication
  onNotification(cb: (notice: Notification) => void): { unsubscribe: any };
};

export class Wallet implements WalletInterface {
  async createChannel(_args: CreateChannelParams): Promise<ChannelResult> {
    throw 'Unimplemented';
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

  async pushMessage(
    message: AddressedMessage
  ): Promise<{ response?: Message; channelResults?: ChannelResult[] }> {
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
            const cols: RequiredColumns = {
            ...ss,
            channelId: calculateChannelId(ss),
            myIndex: 0, // TODO: We need to store private keys to calculate this
            vars: [addHash(ss)],
          };

          channel = Channel.fromJson(cols);
          await Channel.query(tx).insert(channel);
        } else {
          ss.signatures?.map(sig => channel.addState(ss, sig));
          await Channel.query(tx).update(channel);
        }
      }
    });
    } catch (err) {
      logger.error({ err }, 'Could not push message');
      throw err;
    }

    return {};
  }
  onNotification(_cb: (notice: Notification) => void): { unsubscribe: any } {
    throw 'Unimplemented';
  }
}
