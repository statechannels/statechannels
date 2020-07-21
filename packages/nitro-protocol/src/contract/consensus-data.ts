import {utils} from 'ethers';

import {decodeOutcome, encodeOutcome, Outcome} from './outcome';

export interface ConsensusData {
  furtherVotesRequired: number;
  proposedOutcome: Outcome;
}

export function encodeConsensusData(consensusData: ConsensusData): string {
  const proposedOutcome = encodeOutcome(consensusData.proposedOutcome);
  return utils.defaultAbiCoder.encode(
    ['tuple(uint32 furtherVotesRequired, bytes proposedOutcome)'],
    [[consensusData.furtherVotesRequired, proposedOutcome]]
  );
}

export function decodeConsensusData(appData: string): ConsensusData {
  const {furtherVotesRequired, proposedOutcome} = utils.defaultAbiCoder.decode(
    ['tuple(uint32 furtherVotesRequired, bytes proposedOutcome)'],
    appData
  )[0];
  return {furtherVotesRequired, proposedOutcome: decodeOutcome(proposedOutcome)};
}
export function propose(
  proposedOutcome: Outcome,
  currentOutcome: Outcome,
  numberOfParticipants: number
): ConsensusDataWithOutcome {
  return {
    consensusData: {
      proposedOutcome,
      furtherVotesRequired: numberOfParticipants - 1,
    },
    currentOutcome,
  };
}
export function veto(
  currentOutcome: Outcome,
  numberOfParticipants: number
): ConsensusDataWithOutcome {
  return propose([], currentOutcome, numberOfParticipants);
}

export interface ConsensusDataWithOutcome {
  consensusData: ConsensusData;
  currentOutcome: Outcome;
}

export function vote(
  incomingConsensusData: ConsensusData,
  numberOfParticipants: number,
  currentOutcome: Outcome
): ConsensusDataWithOutcome {
  if (incomingConsensusData.furtherVotesRequired === 1) {
    return {
      consensusData: {furtherVotesRequired: numberOfParticipants - 1, proposedOutcome: []},
      currentOutcome: incomingConsensusData.proposedOutcome,
    };
  } else if (incomingConsensusData.furtherVotesRequired > 1) {
    return {
      consensusData: {
        furtherVotesRequired: incomingConsensusData.furtherVotesRequired - 1,
        proposedOutcome: incomingConsensusData.proposedOutcome,
      },
      currentOutcome,
    };
  } else {
    throw new Error(
      `Expected furtherVotesRequired to be greater than 0, received ${incomingConsensusData.furtherVotesRequired} instead`
    );
  }
}

export const voting = {
  propose,
  vote,
  veto,
};
