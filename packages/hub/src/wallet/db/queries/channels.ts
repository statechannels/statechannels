import {getChannelId, isAllocationOutcome, State} from '@statechannels/nitro-protocol';
import {AllocationAssetOutcome} from '@statechannels/nitro-protocol/src/contract/outcome';
import {ethers} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import {Address, Signature, Uint256} from 'fmg-core';
import {CommitmentString} from '../../../types';
import Channel from '../../models/channel';

export interface CreateChannelParams {
  commitment: CommitmentString;
  signature: Signature;
}

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

  // todo: remove hardcoding of only inspecting the first outcome in the outcomes list
  const allocations = (s: State) =>
    isAllocationOutcome(s.outcome[0])
      ? (s.outcome[0] as AllocationAssetOutcome).allocation.map((allocationItem, priority) => ({
          ...allocationItem,
          assetHolderAddress: s.outcome[0].assetHolderAddress,
          priority
        }))
      : [];

  const state = (s: State) => ({
    turn_number: s.turnNum,
    allocations: allocations(s),
    app_data: s.appData
  });

  const commitments = [...stateRound.map(c => state(c)), state(hubState)];
  // todo: refactor guarantees later
  // const guaranteedChannel = stateRound.map(c => c.channel.guaranteedChannel)[0];

  interface Upsert {
    channel_id: string;
    commitments: any[];
    rules_address: Address;
    nonce: Uint256;
    holdings?: Uint256;
    id?: number;
    participants?: any[];
    guaranteedChannel: string;
  }
  let upserts: Upsert = {
    channel_id: channelId,
    commitments,
    rules_address,
    nonce,
    // todo: deal with guarantee channels
    guaranteedChannel: '0x0000000000000000000000000000000000000000'
  };

  // TODO: We are currently using the allocations to set the funding amount
  // This assumes that the channel is funded and DOES NOT work for guarantor channels
  const hubAllocationAmounts = allocations(hubState).map(x => x.amount);

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
    .eager('[commitments.[allocations,channel.[participants]],participants]')
    .upsertGraphAndFetch(upserts);
}

export async function getWithCommitments(channel_id: string) {
  return await Channel.query()
    .where({
      channel_id
    })
    .eager('[commitments.[channel.[participants],allocations]]')
    .first();
}
