import { Commitment, CommitmentType } from 'fmg-core';
import {
  appAttributesFromBytes,
  bytesFromAppAttributes,
} from 'fmg-nitro-adjudicator/lib/consensus-app';
import { ConsensusCommitment } from 'fmg-nitro-adjudicator/lib/consensus-app';
import ChannelCommitment from '../models/channelCommitment';

export type LedgerCommitment = ConsensusCommitment;

export function asCoreCommitment(commitment: LedgerCommitment) {
  return {
    allocation: [],
    ...commitment,
    appAttributes: bytesFromAppAttributes(commitment.appAttributes),
  };
}

export function asConsensusCommitment(c: ChannelCommitment | Commitment): ConsensusCommitment {
  let commitment: Commitment;
  if ('channelId' in c) {
    commitment = c.asCoreCommitment(bytesFromAppAttributes);
  } else {
    commitment = c;
  }

  // To return a discriminated union, when the discriminant is an enum,
  // seems to require type type assertions on the discriminant.
  const { commitmentType } = commitment;
  switch (commitmentType) {
    case CommitmentType.PreFundSetup:
      return {
        ...commitment,
        commitmentType,
        appAttributes: appAttributesFromBytes(commitment.appAttributes),
      };
    case CommitmentType.PostFundSetup:
      return {
        ...commitment,
        commitmentType,
        appAttributes: appAttributesFromBytes(commitment.appAttributes),
      };
    case CommitmentType.App:
      const appAttributes = appAttributesFromBytes(commitment.appAttributes);
      if (appAttributes.furtherVotesRequired === 0) {
        return {
          ...commitment,
          commitmentType,
          appAttributes,
        };
      } else {
        return {
          ...commitment,
          commitmentType,
          appAttributes,
        };
      }
    case CommitmentType.Conclude:
      return {
        ...commitment,
        commitmentType: CommitmentType.Conclude,
        appAttributes: appAttributesFromBytes(commitment.appAttributes),
      };
  }
}
