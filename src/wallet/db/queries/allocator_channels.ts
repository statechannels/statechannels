import { ethers } from 'ethers';
import { Address, CommitmentType, Signature, Uint256, Uint32 } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { AppCommitment, CommitmentString } from '../../../types';
import errors from '../../errors';
import AllocatorChannel from '../../models/allocatorChannel';

export interface CreateAllocatorChannelParams {
  commitment: CommitmentString;
  signature: Signature;
}
export interface IAllocatorChannel {
  channelId: Address;
  channelType: Address;
  nonce_id: number;
}

export const queries = {
  updateAllocatorChannel,
};

async function updateAllocatorChannel(
  commitmentRound: AppCommitment[],
  hubCommitment: AppCommitment,
) {
  const firstCommitment = commitmentRound[0];
  const { channel } = firstCommitment;
  const { channelType: rules_address, nonce, participants } = channel;
  const channelId = channelID(channel);

  const allocator_channel = await AllocatorChannel.query()
    .where({ channel_id: channelId })
    .select('id')
    .first();

  if (allocator_channel && firstCommitment.commitmentType === CommitmentType.PreFundSetup) {
    throw errors.CHANNEL_EXISTS;
  } else if (!allocator_channel && firstCommitment.commitmentType !== CommitmentType.PreFundSetup) {
    throw errors.CHANNEL_MISSING;
  }

  const allocationByPriority = (priority: number, c: AppCommitment) => ({
    priority,
    destination: c.destination[priority],
    amount: c.allocation[priority],
  });

  const allocations = (c: AppCommitment) => c.allocation.map((_, i) => allocationByPriority(i, c));

  const commitment = (c: AppCommitment) => ({
    turn_number: c.turnNum,
    commitment_type: c.commitmentType,
    commitment_count: c.commitmentCount,
    allocations: allocations(c),
    app_attrs: c.appAttributes,
  });

  const commitments = [...commitmentRound.map(c => commitment(c)), commitment(hubCommitment)];

  interface Upsert {
    channel_id: string;
    commitments: any[];
    rules_address: Address;
    nonce: Uint32;
    holdings?: Uint256;
    id?: number;
    participants?: any[];
  }
  let upserts: Upsert = { channel_id: channelId, commitments, rules_address, nonce };

  // For now, we just _assume_ that the channel is fully funded
  const holdings = allocations(hubCommitment)
    .map(x => x.amount)
    .reduce((a, b) =>
      ethers.utils
        .bigNumberify(a)
        .add(ethers.utils.bigNumberify(b))
        .toHexString(),
    );

  if (allocator_channel) {
    upserts = { ...upserts, id: allocator_channel.id };
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

  return AllocatorChannel.query()
    .eager('[commitments.[allocations,allocatorChannel.[participants]],participants]')
    .upsertGraphAndFetch(upserts);
}

export async function getWithCommitments(channel_id: string) {
  return await AllocatorChannel.query()
    .where({
      channel_id,
    })
    .eager('[commitments.[allocatorChannel.[participants],allocations]]')
    .first();
}
