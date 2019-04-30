import { BaseCommitment, CommitmentType } from 'fmg-core';
import { AppAttributes, bytesFromAppAttributes } from 'fmg-nitro-adjudicator';

export interface LedgerCommitment extends BaseCommitment {
  appAttributes: AppAttributes;
  commitmentType: CommitmentType;
}

export function asCoreCommitment(commitment: LedgerCommitment) {
  return {
    ...commitment,
    appAttributes: bytesFromAppAttributes(commitment.appAttributes),
  };
}
