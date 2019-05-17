import { channelID, Commitment } from 'fmg-core';
import { errors } from '../../../wallet';
import AllocatorChannel from '../../../wallet/models/allocatorChannel';
import AllocatorChannelCommitment from '../../../wallet/models/allocatorChannelCommitment';

export async function getCurrentCommitment(theirCommitment: Commitment) {
  const { channel } = theirCommitment;
  const channel_id = channelID(channel);
  const allocatorChannel = await AllocatorChannel.query()
    .where({ channel_id })
    .select('id')
    .first();
  if (!allocatorChannel) {
    throw errors.CHANNEL_MISSING;
  }
  const currentCommitment = await AllocatorChannelCommitment.query()
    .where({ allocatorChannelId: allocatorChannel.id })
    .orderBy('turn_number', 'desc')
    .select()
    .first();
  return currentCommitment;
}
