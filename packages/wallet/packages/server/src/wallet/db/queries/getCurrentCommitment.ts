import { channelID, Commitment } from 'fmg-core';
import Channel from '../../models/channel';
import ChannelCommitment from '../../models/channelCommitment';

export async function getCurrentCommitment(theirCommitment: Commitment) {
  const { channel: commitmentChannel } = theirCommitment;
  const channel_id = channelID(commitmentChannel);
  const channel = await Channel.query()
    .where({ channel_id })
    .select('id')
    .first();
  if (!channel) {
    return;
  }
  const currentCommitment = await ChannelCommitment.query()
    .where({ channel_id: channel.id })
    .orderBy('turn_number', 'desc')
    .eager('[channel.[participants],allocations]')
    .select()
    .first();

  return currentCommitment;
}
