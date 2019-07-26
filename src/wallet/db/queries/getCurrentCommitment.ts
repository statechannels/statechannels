import { channelID, Commitment } from 'fmg-core';
import AllocatorChannel from '../../models/allocatorChannel';
import AllocatorChannelCommitment from '../../models/allocatorChannelCommitment';

export async function getCurrentCommitment(theirCommitment: Commitment) {
  const { channel } = theirCommitment;
  const channel_id = channelID(channel);
  const allocatorChannel = await AllocatorChannel.query()
    .where({ channel_id })
    .select('id')
    .first();
  if (!allocatorChannel) {
    return;
  }
  const currentCommitment = await AllocatorChannelCommitment.query()
    .where({ channel_id: allocatorChannel.id })
    .orderBy('turn_number', 'desc')
    .eager('[allocatorChannel.[participants],allocations]')
    .select()
    .first();

  return currentCommitment;
}
