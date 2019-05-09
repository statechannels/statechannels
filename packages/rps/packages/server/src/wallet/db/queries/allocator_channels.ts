import { ethers } from 'ethers';
import { Address, CommitmentType, Signature, Uint256, Uint32 } from 'fmg-core';
import { AppCommitment, CommitmentString } from '../../../types';
import errors from '../../errors';
import AllocatorChannel from '../../models/allocatorChannel';
import { channelID } from 'fmg-core/lib/channel';

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
  theirCommitment: AppCommitment,
  hubCommitment: AppCommitment,
) {
  const { channel } = theirCommitment;
  const { channelType: rules_address, nonce, participants } = channel;
  const channelId = channelID(channel);

  const allocator_channel = await AllocatorChannel.query()
    .where({ channel_id: channelId })
    .select('id')
    .first();

  if (allocator_channel && theirCommitment.commitmentType === CommitmentType.PreFundSetup) {
    throw errors.CHANNEL_EXISTS;
  } else if (!allocator_channel && theirCommitment.commitmentType !== CommitmentType.PreFundSetup) {
    throw errors.CHANNEL_MISSING;
  }

  const allocationByPriority = (priority: number, c: AppCommitment) => ({
    priority,
    destination: c.destination[priority],
    amount: c.allocation[priority],
  });

  const allocations = (c: AppCommitment) => [
    allocationByPriority(0, c),
    allocationByPriority(1, c),
  ];

  const commitment = (c: AppCommitment) => ({
    turn_number: c.turnNum,
    commitment_type: c.commitmentType,
    commitment_count: c.commitmentCount,
    allocations: allocations(c),
    app_attrs: c.appAttributes,
  });

  const commitments = [commitment(theirCommitment), commitment(hubCommitment)];

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
  const holdings = allocations(theirCommitment)
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
    .eager('[commitments.[allocations],participants]')
    .upsertGraphAndFetch(upserts);
}
