import {getChannelId, State} from '@statechannels/nitro-protocol';
import {Uint256} from '../../types';
import errors from '../../errors';
import Channel from '../../models/channel';
import {outcomeObjectToModel} from '../../utilities/outcome';

export const queries = {
  updateChannel
};

async function updateChannel(stateRound: State[], hubState: State) {
  const firstState = stateRound[0];
  const {channel} = firstState;
  const {channelNonce, participants, chainId} = channel;
  const channelId = getChannelId(channel);

  const storedChannel = await Channel.query()
    .findOne({channel_id: channelId})
    .select('id');

  if (storedChannel && firstState.turnNum < firstState.channel.participants.length) {
    throw errors.CHANNEL_EXISTS;
  } else if (!storedChannel && firstState.turnNum >= firstState.channel.participants.length) {
    throw errors.CHANNEL_MISSING;
  }

  const outcome = (s: State) => outcomeObjectToModel(s.outcome);
  const stateModel = (s: State) => ({
    turnNum: s.turnNum,
    isFinal: s.isFinal,
    challengeDuration: s.challengeDuration,
    outcome: outcome(s),
    appDefinition: s.appDefinition,
    appData: s.appData
  });

  const states = [...stateRound.map(s => stateModel(s)), stateModel(hubState)];

  interface Upsert {
    channelId: string;
    states: any[];
    channelNonce: number;
    holdings?: any[];
    id?: number;
    participants?: any[];
    chainId: Uint256;
  }
  let upserts: Upsert = {
    channelId,
    states,
    channelNonce,
    chainId
  };

  if (storedChannel) {
    upserts = {...upserts, id: storedChannel.id};
  } else {
    upserts = {
      ...upserts,
      participants: participants.map((address, i) => ({
        address,
        priority: i
      }))
    };
  }

  return Channel.query()
    .upsertGraphAndFetch(upserts)
    .eager('[participants, holdings, states.[outcome.[allocationItems]]]');
}
