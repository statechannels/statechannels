import Objection from 'objection';

import {SignState} from '../protocols/actions';
import {Channel} from '../models/channel';

export async function handleSignState(
  action: SignState,
  tx: Objection.Transaction
): Promise<Channel> {
  const channel = await Channel.forId(action.channelId, tx);
  channel.signAndAdd(action);
  await Channel.query(tx).update(channel);

  return channel;
}
