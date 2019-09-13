import {Outcome, encodeOutcome} from './outcome';
import {defaultAbiCoder} from 'ethers/utils';

export interface ConsensusData {
  furtherVotesRequired: number;
  proposedOutcome: Outcome;
}

export function encodeConsensusData(consensusData: ConsensusData): string {
  const proposedOutcome = encodeOutcome(consensusData.proposedOutcome);
  return defaultAbiCoder.encode(
    ['tuple(uint32, bytes)'],
    [[consensusData.furtherVotesRequired, proposedOutcome]],
  );
}
