import { CommitmentType, Signature } from 'fmg-core';
import {
  AppCommitment,
  finalVote,
  isConsensusReached,
  pass,
  vote,
} from 'fmg-nitro-adjudicator/lib/consensus-app';
import { unreachable } from 'magmo-wallet';
import { SignedCommitment } from '.';
import { queries } from '../db/queries/allocator_channels';
import errors from '../errors';
import * as ChannelManagement from './channelManagement';
import { asCoreCommitment, LedgerCommitment } from './ledger-commitment';

// TODO: This should be extracted into a hub app?
export async function updateLedgerChannel(
  theirCommitment: LedgerCommitment,
  theirSignature: Signature,
  currentCommitment?: LedgerCommitment,
): Promise<SignedCommitment> {
  const ourCommitment = nextCommitment(theirCommitment, theirSignature, currentCommitment);
  await queries.updateAllocatorChannel(theirCommitment, ourCommitment);
  return ChannelManagement.formResponse(asCoreCommitment(ourCommitment));
}

export function nextCommitment(
  theirCommitment: LedgerCommitment,
  theirSignature: Signature,
  currentCommitment?: LedgerCommitment,
): LedgerCommitment {
  if (!ChannelManagement.validSignature(asCoreCommitment(theirCommitment), theirSignature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
  }

  if (theirCommitment.turnNum > 0) {
    if (!valuePreserved(currentCommitment, theirCommitment)) {
      throw errors.VALUE_LOST;
    }

    if (
      theirCommitment.commitmentType !== CommitmentType.PreFundSetup &&
      !validTransition(currentCommitment, theirCommitment)
    ) {
      throw errors.INVALID_TRANSITION;
    }
  }

  if (theirCommitment.commitmentType !== CommitmentType.App) {
    return ChannelManagement.nextCommitment(theirCommitment) as LedgerCommitment;
  }

  if (finalVoteRequired(theirCommitment)) {
    return finalVote(theirCommitment);
  } else if (voteRequired(theirCommitment)) {
    return vote(theirCommitment);
  } else if (isConsensusReached(theirCommitment)) {
    return pass(theirCommitment);
  } else {
    return unreachable(theirCommitment);
  }
}

function finalVoteRequired(c: LedgerCommitment): c is AppCommitment {
  return c.appAttributes.furtherVotesRequired === 1;
}

function voteRequired(c: LedgerCommitment): c is AppCommitment {
  return c.appAttributes.furtherVotesRequired > 1;
}

export function valuePreserved(currentCommitment: any, theirCommitment: any): boolean {
  return currentCommitment || (theirCommitment && true);
}

export function validTransition(
  currentCommitment: LedgerCommitment,
  theirCommitment: LedgerCommitment,
): boolean {
  return theirCommitment.turnNum === currentCommitment.turnNum + 1;
}
