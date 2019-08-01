import { ethers } from 'ethers';
import { bigNumberify } from 'ethers/utils';
import { Address, channelID, CommitmentType, Signature, Uint256, Uint32 } from 'fmg-core';
import { AppCommitment, CommitmentString } from '../../../types';
import errors from '../../errors';
import Channel from '../../models/channel';

export interface CreateChannelParams {
  commitment: CommitmentString;
  signature: Signature;
}
export interface IChannel {
  channelId: Address;
  channelType: Address;
  nonce_id: number;
}

export const queries = {
  updateChannel,
};

async function updateChannel(commitmentRound: AppCommitment[], hubCommitment: AppCommitment) {
  const firstCommitment = commitmentRound[0];
  const { channel } = firstCommitment;
  const { channelType: rules_address, nonce, participants } = channel;
  const channelId = channelID(channel);

  const storedChannel = await Channel.query()
    .where({ channel_id: channelId })
    .select('id')
    .first();

  if (storedChannel && firstCommitment.commitmentType === CommitmentType.PreFundSetup) {
    throw errors.CHANNEL_EXISTS;
  } else if (!storedChannel && firstCommitment.commitmentType !== CommitmentType.PreFundSetup) {
    throw errors.CHANNEL_MISSING;
  }

  const allocationByPriority = (priority: number, c: AppCommitment) => ({
    priority,
    destination: c.destination[priority],
    amount: c.allocation[priority],
  });

  const allocations = (c: AppCommitment) =>
    !c.channel.guaranteedChannel ? c.allocation.map((_, i) => allocationByPriority(i, c)) : [];

  const commitment = (c: AppCommitment) => ({
    turn_number: c.turnNum,
    commitment_type: c.commitmentType,
    commitment_count: c.commitmentCount,
    allocations: allocations(c),
    app_attrs: c.appAttributes,
  });

  const commitments = [...commitmentRound.map(c => commitment(c)), commitment(hubCommitment)];
  const guaranteedChannel = commitmentRound.map(c => c.channel.guaranteedChannel)[0];

  interface Upsert {
    channel_id: string;
    commitments: any[];
    rules_address: Address;
    nonce: Uint32;
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
    guaranteedChannel,
  };

  // TODO: We are currently using the allocations to set the funding amount
  // This assumes that the channel is funded and DOES NOT work for guarantor channels
  const hubAllocationAmounts = allocations(hubCommitment).map(x => x.amount);

  const holdings = hubAllocationAmounts.reduce(
    (a, b) =>
      ethers.utils
        .bigNumberify(a)
        .add(ethers.utils.bigNumberify(b))
        .toHexString(),
    bigNumberify(0).toHexString(),
  );

  if (storedChannel) {
    upserts = { ...upserts, id: storedChannel.id };
  } else {
    upserts = {
      ...upserts,
      participants: participants.map((address, i) => ({
        address,
        priority: i,
      })),
      holdings,
    };
  }

  return Channel.query()
    .eager('[commitments.[allocations,channel.[participants]],participants]')
    .upsertGraphAndFetch(upserts);
}

export async function getWithCommitments(channel_id: string) {
  return await Channel.query()
    .where({
      channel_id,
    })
    .eager('[commitments.[channel.[participants],allocations]]')
    .first();
}
