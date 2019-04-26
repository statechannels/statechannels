import { Commitment as C, CommitmentType as CT } from 'fmg-core';
import { validCommitmentSignature, signCommitment as signCommitmentUtil } from './signing-utils';
import { channelID } from 'fmg-core/lib/channel';

export type Commitment = C;
export const CommitmentType = CT;

export interface SignedCommitment {
  commitment: Commitment;
  signature: string;
}

// -------
// Helpers
// -------

// temporary name while we remove the old signCommitment method
export function signCommitment2(commitment: Commitment, privateKey: string): SignedCommitment {
  return { commitment, signature: signCommitmentUtil(commitment, privateKey) };
}

function getTurnTaker(commitment: Commitment): string {
  const { turnNum, channel } = commitment;
  const participants = channel.participants;
  const numParticipants = participants.length;
  return participants[turnNum % numParticipants];
}

export function hasValidSignature(signedCommitment: SignedCommitment): boolean {
  const { commitment, signature } = signedCommitment;
  const address = getTurnTaker(commitment);
  return validCommitmentSignature(commitment, signature, address);
}

export function getChannelId(commitment: Commitment): string {
  return channelID(commitment.channel);
}

function incrementTurnNum(commitment: Commitment): Commitment {
  return { ...commitment, turnNum: commitment.turnNum + 1 };
}

export function constructConclude(commitment: Commitment): Commitment {
  return { ...incrementTurnNum(commitment), commitmentType: CommitmentType.Conclude };
}
