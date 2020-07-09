import errors from '../../errors';
import Channel from '../../models/channel';
import { State, calculateChannelId } from '@statechannels/wallet-core';

export const queries = {
  updateChannel,
};

async function updateChannel(stateRound: State[], hubState: State) {
  const firstState = stateRound[0];
  const { channelNonce, participants, chainId } = firstState;
  const channelId = calculateChannelId(firstState);

  const storedChannel = await Channel.query().findOne({ channel_id: channelId }).select('id');

  if (storedChannel && firstState.turnNum < firstState.participants.length) {
    throw errors.CHANNEL_EXISTS;
  } else if (!storedChannel && firstState.turnNum >= firstState.participants.length) {
    throw errors.CHANNEL_MISSING;
  }

  const states = [...stateRound, hubState];

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
    chainId,
  };

  if (storedChannel) {
    upserts = { ...upserts, id: storedChannel.id };
  } else {
    upserts = {
      ...upserts,
      participants: participants.map((address, i) => ({
        address,
        priority: i,
      })),
    };
  }

  return Channel.query()
    .upsertGraphAndFetch(upserts)
    .eager('[participants, holdings, states.[outcome.[allocationItems]]]');
}
