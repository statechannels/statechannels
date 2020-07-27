import Objection from 'objection';

import {SignState} from '../protocols/actions';
import {Channel, SyncState} from '../models/channel';

export const Store = {
  signState: async function(action: SignState, tx: Objection.Transaction): Promise<SyncState> {
    const channel = await Channel.forId(action.channelId, tx);
    const notifications = channel.signAndAdd(action);
    await Channel.query(tx).update(channel);

    return notifications;
  },
};
