import { CommitmentType, Signature } from 'fmg-core';
import { SignedCommitment } from '.';
import { queries } from '../db/queries/allocator_channels';
import errors from '../errors';
import AllocatorChannelCommitment from '../models/allocatorChannelCommitment';
import * as ChannelManagement from './channelManagement';
import { asCoreCommitment, asLedgerCommitment, LedgerCommitment } from './ledger-commitment';

// TODO: This should be extracted into a hub app?
export async function updateLedgerChannel(
  currentCommitment: AllocatorChannelCommitment,
  theirCommitment: LedgerCommitment,
  theirSignature: Signature,
): Promise<SignedCommitment> {
  if (!ChannelManagement.validSignature(asCoreCommitment(theirCommitment), theirSignature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
  }

  if (!valuePreserved(currentCommitment, theirCommitment)) {
    throw errors.VALUE_LOST;
  }

  if (
    theirCommitment.commitmentType !== CommitmentType.PreFundSetup &&
    !validTransition(asLedgerCommitment(currentCommitment), theirCommitment)
  ) {
    throw errors.INVALID_TRANSITION;
  }

  const ourCommitment = nextCommitment(theirCommitment);

  await queries.updateAllocatorChannel(theirCommitment, ourCommitment);
  return ChannelManagement.formResponse(asCoreCommitment(ourCommitment));
}

export async function openLedgerChannel(
  theirCommitment: LedgerCommitment,
  theirSignature: Signature,
): Promise<SignedCommitment> {
  if (!ChannelManagement.validSignature(asCoreCommitment(theirCommitment), theirSignature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
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

export function valuePreserved(currentCommitment: any, theirCommitment: any): boolean {
  return currentCommitment && theirCommitment && true;
}

export function validTransition(
  currentCommitment: LedgerCommitment,
  theirCommitment: LedgerCommitment,
): boolean {
  return theirCommitment.turnNum === currentCommitment.turnNum + 1;
}
