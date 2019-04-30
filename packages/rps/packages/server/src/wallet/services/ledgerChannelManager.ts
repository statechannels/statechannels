import { CommitmentType, Signature } from 'fmg-core';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { ChannelResponse } from '.';
import { queries } from '../db/queries/allocator_channels';
import errors from '../errors';
import AllocatorChannel from '../models/allocatorChannel';
import AllocatorChannelCommitment from '../models/allocatorChannelCommitment';
import * as ChannelManagement from './channelManagement';
import { asCoreCommitment, LedgerCommitment } from './ledger-commitment';

// TODO: This should be extracted into a hub app?
export async function updateLedgerChannel(
  theirCommitment: LedgerCommitment,
  theirSignature: Signature,
): Promise<ChannelResponse> {
  if (!ChannelManagement.validSignature(asCoreCommitment(theirCommitment), theirSignature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
  }

  if (!(await valuePreserved(theirCommitment))) {
    throw errors.VALUE_LOST;
  }

  if (
    theirCommitment.commitmentType !== CommitmentType.PreFundSetup &&
    !(await validTransition(theirCommitment))
  ) {
    throw errors.INVALID_TRANSITION;
  }

  const ourCommitment = nextCommitment(theirCommitment);

  const allocator_channel = await queries.updateAllocatorChannel(theirCommitment, ourCommitment);
  return ChannelManagement.formResponse(allocator_channel.id, bytesFromAppAttributes);
}

export function nextCommitment(theirCommitment: LedgerCommitment): LedgerCommitment {
  if (theirCommitment.commitmentType !== CommitmentType.App) {
    return ChannelManagement.nextCommitment(theirCommitment);
  }

  return {
    ...theirCommitment,
    turnNum: theirCommitment.turnNum + 1,
    commitmentCount: 0,
    appAttributes: {
      ...theirCommitment.appAttributes,
      consensusCounter: theirCommitment.appAttributes.consensusCounter + 1,
    },
  };
}

export async function valuePreserved(theirCommitment: any): Promise<boolean> {
  return theirCommitment && true;
}

export async function validTransition(theirCommitment: LedgerCommitment): Promise<boolean> {
  const { channel } = theirCommitment;
  const allocator_channel = await AllocatorChannel.query()
    .where({ rules_address: channel.channelType, nonce: channel.nonce })
    .select('id')
    .first();

  if (!allocator_channel) {
    throw errors.CHANNEL_MISSING;
  }

  const currentCommitment = await AllocatorChannelCommitment.query()
    .where({ allocator_channel_id: allocator_channel.id })
    .orderBy('id', 'desc')
    .select()
    .first();

  return theirCommitment.turnNum === currentCommitment.turn_number + 1;
}
