import Objection from 'objection';
import {ChannelResult} from '@statechannels/client-api-schema';

import {SignState} from '../protocols/actions';
import {Channel, SyncState} from '../models/channel';
import {Bytes32} from '../type-aliases';
import {ChannelState} from '../protocols/state';

export const Store = {
  signState: async function(
    action: SignState,
    tx: Objection.Transaction
  ): Promise<{outgoing: SyncState; channelResult: ChannelResult}> {
    const channel = await Channel.forId(action.channelId, tx);
    const outgoing = channel.signAndAdd(action);
    await Channel.query(tx).update(channel);

    const {channelResult} = channel;

    return {outgoing, channelResult};
  },

  getChannel: async function(
    channelId: Bytes32,
    tx: Objection.Transaction | undefined
  ): Promise<ChannelState | undefined> {
    return (await Channel.forId(channelId, tx))?.protocolState;
  },
};
