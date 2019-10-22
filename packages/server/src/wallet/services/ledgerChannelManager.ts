import { CommitmentType } from 'fmg-core';
import {
  AppCommitment,
  finalVote,
  isConsensusReached,
  pass,
  vote,
} from 'fmg-nitro-adjudicator/lib/consensus-app';
import { unreachable } from 'magmo-wallet';
import { SignedCommitment, SignedLedgerCommitment } from '.';
import { HUB_ADDRESS } from '../../constants';
import { queries } from '../db/queries/channels';
import errors from '../errors';
import * as ChannelManagement from './channelManagement';
import { asCoreCommitment, LedgerCommitment } from './ledger-commitment';

export async function updateLedgerChannel(
  commitmentRound: SignedLedgerCommitment[],
  lastStoredCommitment?: LedgerCommitment,
): Promise<SignedCommitment> {
  let commitmentsToApply = commitmentRound;
  if (lastStoredCommitment) {
    commitmentsToApply = commitmentRound.filter(
      signedCommitment => signedCommitment.ledgerCommitment.turnNum > lastStoredCommitment.turnNum,
    );
  }
  commitmentsToApply.sort((a, b) => {
    return a.ledgerCommitment.turnNum - b.ledgerCommitment.turnNum;
  });

  let lastValidCommitment = lastStoredCommitment;
  for (const commitmentToApply of commitmentsToApply) {
    if (!shouldAcceptCommitment(commitmentToApply, lastValidCommitment)) {
      throw errors.INVALID_COMMITMENT_UNKNOWN_REASON;
    }
    lastValidCommitment = commitmentToApply.ledgerCommitment;
  }

  const ourCommitment = nextCommitment(commitmentsToApply);
  const commitmentToStore = commitmentsToApply.map(
    signedCommitment => signedCommitment.ledgerCommitment,
  );
  // todo: signatures need to be stored alongside commitments
  await queries.updateChannel(commitmentToStore, ourCommitment);
  return ChannelManagement.formResponse(asCoreCommitment(ourCommitment));
}

function shouldAcceptCommitment(
  signedCommitment: SignedLedgerCommitment,
  previousCommitment?: LedgerCommitment,
) {
  const { ledgerCommitment: commitment, signature } = signedCommitment;
  if (!ChannelManagement.validSignature(asCoreCommitment(commitment), signature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
  }

  if (commitment.turnNum > 0) {
    if (!valuePreserved(previousCommitment, commitment)) {
      throw errors.VALUE_LOST;
    }

    if (
      commitment.commitmentType !== CommitmentType.PreFundSetup &&
      !validTransition(previousCommitment, commitment)
    ) {
      throw errors.INVALID_TRANSITION;
    }
  }
  return true;
}

export function nextCommitment(commitmentRound: SignedLedgerCommitment[]): LedgerCommitment {
  // Check that it is our turn
  const lastCommitmnent = commitmentRound.slice(-1)[0].ledgerCommitment;
  const participants = lastCommitmnent.channel.participants;
  const ourIndex = participants.indexOf(HUB_ADDRESS);
  const lastTurn = lastCommitmnent.turnNum;
  const numParticipants = participants.length;
  if ((lastTurn + 1) % numParticipants !== ourIndex) {
    throw errors.NOT_OUR_TURN;
  }

  if (lastCommitmnent.commitmentType !== CommitmentType.App) {
    return ChannelManagement.nextCommitment(lastCommitmnent) as LedgerCommitment;
  }

  if (finalVoteRequired(lastCommitmnent)) {
    return finalVote(lastCommitmnent);
  } else if (voteRequired(lastCommitmnent)) {
    return vote(lastCommitmnent);
  } else if (isConsensusReached(lastCommitmnent)) {
    return pass(lastCommitmnent);
  } else {
    return unreachable(lastCommitmnent);
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
