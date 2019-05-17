import { CommitmentType, Signature } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { SignedCommitment } from '.';
import { queries } from '../db/queries/allocator_channels';
import errors from '../errors';
import AllocatorChannel from '../models/allocatorChannel';
import AllocatorChannelCommitment from '../models/allocatorChannelCommitment';
import * as ChannelManagement from './channelManagement';
import { asCoreCommitment, asLedgerCommitment, LedgerCommitment } from './ledger-commitment';

// TODO: This should be extracted into a hub app?
export async function updateLedgerChannel(
  theirCommitment: LedgerCommitment,
  theirSignature: Signature,
): Promise<SignedCommitment> {
  if (!ChannelManagement.validSignature(asCoreCommitment(theirCommitment), theirSignature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
  }

  const { channel } = theirCommitment;
  const channel_id = channelID(channel);
  if (theirCommitment.turnNum > 0) {
    const allocatorChannel = await AllocatorChannel.query()
      .where({ channel_id })
      .select('id')
      .first();

    if (!allocatorChannel) {
      console.warn(channel_id);
      throw errors.CHANNEL_MISSING;
    }

    const currentCommitment = await AllocatorChannelCommitment.query()
      .where({ allocatorChannelId: allocatorChannel.id })
      .orderBy('turn_number', 'desc')
      .select()
      .first();

    if (!(await valuePreserved(theirCommitment))) {
      throw errors.VALUE_LOST;
    }

    if (
      theirCommitment.commitmentType !== CommitmentType.PreFundSetup &&
      !validTransition(asLedgerCommitment(currentCommitment), theirCommitment)
    ) {
      throw errors.INVALID_TRANSITION;
    }
  }

  const ourCommitment = nextCommitment(theirCommitment);

  await queries.updateAllocatorChannel(theirCommitment, ourCommitment);
  return ChannelManagement.formResponse(asCoreCommitment(ourCommitment));
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
      furtherVotesRequired: theirCommitment.appAttributes.furtherVotesRequired - 1,
    },
  };
}

export async function valuePreserved(theirCommitment: any): Promise<boolean> {
  return theirCommitment && true;
}

export function validTransition(
  currentCommitment: LedgerCommitment,
  theirCommitment: LedgerCommitment,
): boolean {
  return theirCommitment.turnNum === currentCommitment.turnNum + 1;
}
