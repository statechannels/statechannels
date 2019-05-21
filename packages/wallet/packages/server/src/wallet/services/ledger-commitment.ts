import { BaseCommitment, CommitmentType } from 'fmg-core';
import {
  AppAttributes,
  appAttributesFromBytes,
  bytesFromAppAttributes,
} from 'fmg-nitro-adjudicator';
import AllocatorChannelCommitment from '../models/allocatorChannelCommitment';

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

export function asLedgerCommitment(c: AllocatorChannelCommitment) {
  const commitment = c.asCoreCommitment(bytesFromAppAttributes);
  return {
    ...commitment,
    appAttributes: appAttributesFromBytes(commitment.appAttributes),
  };
}
