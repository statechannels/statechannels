import {Outcome, encodeOutcome, decodeOutcome} from './outcome';
import {defaultAbiCoder} from 'ethers/utils';

export interface ConsensusData {
  furtherVotesRequired: number;
  proposedOutcome: Outcome;
}

export function encodeConsensusData(consensusData: ConsensusData): string {
  const proposedOutcome = encodeOutcome(consensusData.proposedOutcome);
  return defaultAbiCoder.encode(
    ['tuple(uint32 furtherVotesRequired, bytes proposedOutcome)'],
    [[consensusData.furtherVotesRequired, proposedOutcome]],
  );
}

export function decodeConsensusData(appData: string): ConsensusData {
  const {furtherVotesRequired, proposedOutcome} = defaultAbiCoder.decode(
    ['tuple(uint32 furtherVotesRequired, bytes proposedOutcome)'],
    appData,
  )[0];
  return {furtherVotesRequired, proposedOutcome: decodeOutcome(proposedOutcome)};
}

function veto(previousConsensusData: ConsensusData, numberOfParticipants: number): ConsensusData {
  return propose(previousConsensusData, numberOfParticipants);
}

function propose(consensusData: ConsensusData, numberOfParticipants: number): ConsensusData {
  return {
    proposedOutcome: consensusData.proposedOutcome,
    furtherVotesRequired: numberOfParticipants - 1,
  };
}

function vote(consensusData: ConsensusData): ConsensusData {
  return {
    proposedOutcome: consensusData.proposedOutcome,
    furtherVotesRequired: consensusData.furtherVotesRequired - 1,
  };
}

function finalVote(consensusData: ConsensusData): ConsensusData {
  if (consensusData.furtherVotesRequired !== 0) {
    throw new Error(
      `Expected furtherVotesRequired to be 1, received ${consensusData.furtherVotesRequired} instead.`,
    );
  }
  // If it's the final vote we return zeroed out consensusData
  return {furtherVotesRequired: 0, proposedOutcome: []};
}

export const voting = {
  veto,
  propose,
  vote,
  finalVote,
};
