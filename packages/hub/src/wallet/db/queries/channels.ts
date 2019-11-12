import {getChannelId, State} from '@statechannels/nitro-protocol';
import {ethers} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import {Address, Uint256} from 'fmg-core';
import errors from '../../errors';
import Channel from '../../models/channel';
import {outcomeAddPriorities} from '../utils';

export const queries = {
  updateChannel
};

async function updateChannel(stateRound: State[], hubState: State) {
  const firstState = stateRound[0];
  const {channel, appDefinition: rules_address} = firstState;
  const {channelNonce: nonce, participants} = channel;
  const channelId = getChannelId(channel);

  const storedChannel = await Channel.query()
    .where({channel_id: channelId})
    .select('id')
    .first();

  if (storedChannel && firstState.turnNum < firstState.channel.participants.length) {
    throw errors.CHANNEL_EXISTS;
  } else if (!storedChannel && firstState.turnNum >= firstState.channel.participants.length) {
    throw errors.CHANNEL_MISSING;
  }

  const outcome = (s: State) => outcomeAddPriorities(s.outcome);
  const state = (s: State) => ({
    turn_num: s.turnNum,
    outcome: outcome(s),
    app_data: s.appData
  });

  const states = [...stateRound.map(s => state(s)), state(hubState)];

  // todo: refactor guarantees later
  // const guaranteedChannel = stateRound.map(c => c.channel.guaranteedChannel)[0];

  interface Upsert {
    channel_id: string;
    states: any[];
    rules_address: Address;
    nonce: Uint256;
    holdings?: Uint256;
    id?: number;
    participants?: any[];
  }
  let upserts: Upsert = {
    channel_id: channelId,
    states,
    rules_address,
    nonce
  };

  // TODO: We are currently using the allocations to set the funding amount
  // This assumes that the channel is funded and DOES NOT work for guarantor channels
  // todo: asset holder address needs to be considered
  const hubAllocationAmounts = outcome(hubState)[0].allocation.map(x => x.amount);

  const holdings = hubAllocationAmounts.reduce(
    (a, b) =>
      ethers.utils
        .bigNumberify(a)
        .add(ethers.utils.bigNumberify(b))
        .toHexString(),
    bigNumberify(0).toHexString()
  );

  if (storedChannel) {
    upserts = {...upserts, id: storedChannel.id};
  } else {
    upserts = {
      ...upserts,
      participants: participants.map((address, i) => ({
        address,
        priority: i
      })),
      holdings
    };
  }

  return Channel.query()
    .upsertGraphAndFetch(upserts)
    .eager('[participants, states.[outcome.[allocation]]]');
}
