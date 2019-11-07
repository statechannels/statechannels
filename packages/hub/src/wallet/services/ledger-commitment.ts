import {bytesFromAppAttributes} from 'fmg-nitro-adjudicator/lib/consensus-app';
import {ConsensusCommitment} from 'fmg-nitro-adjudicator/lib/consensus-app';

export type LedgerCommitment = ConsensusCommitment;

export function asCoreCommitment(commitment: LedgerCommitment) {
  return {
    allocation: [],
    ...commitment,
    appAttributes: bytesFromAppAttributes(commitment.appAttributes)
  };
}
