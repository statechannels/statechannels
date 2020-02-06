import {getChannelId, State} from '@statechannels/nitro-protocol';
import Channel from '../../models/channel';
import ChannelState from '../../models/channelState';

export async function getCurrentState(theirState: State) {
  const {channel: stateChannel} = theirState;
  const channelId = getChannelId(stateChannel);
  const channel = await Channel.query()
    .findOne({channel_id: channelId})
    .select('id');
  if (!channel) {
    return null;
  }
  const currentState = await ChannelState.query()
    .where({channel_id: channel.id})
    .orderBy('turn_num', 'desc')
    .eager('[channel.[participants], outcome.[allocationItems]]')
    .select()
    .first();

  return currentState;
}
