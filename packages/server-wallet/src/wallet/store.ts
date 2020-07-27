import Objection from 'objection';

import {SignState} from '../protocols/actions';
import {Channel, SyncState} from '../models/channel';
import {Bytes32} from '../type-aliases';
import {ChannelState} from '../protocols/state';

export const Store = {
  signState: async function(action: SignState, tx: Objection.Transaction): Promise<SyncState> {
    const channel = await Channel.forId(action.channelId, tx);
    const notifications = channel.signAndAdd(action);
    await Channel.query(tx).update(channel);

    return notifications;
  },

  getChannel: async function(
    channelId: Bytes32,
    tx: Objection.Transaction | undefined
  ): Promise<ChannelState> {
    return (await Channel.forId(channelId, tx)).protocolState;
  },
};
