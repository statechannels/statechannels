import {
  CommitmentType,
  Uint32,
  Uint256,
  Address,
  Bytes,
  BaseCommitment,
  Channel,
  Commitment,
} from 'fmg-core';
import abi from 'web3-eth-abi';
import { bigNumberify } from 'ethers/utils';

export interface AppAttributes {
  furtherVotesRequired: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
}
export interface ConsensusBaseCommitment extends BaseCommitment {
  appAttributes: AppAttributes;
}

export interface PreFundSetupCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.PreFundSetup;
}
export interface PostFundSetupCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.PostFundSetup;
}
export interface AppCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.App;
}
export interface ConcludeCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.Conclude;
}

export type ConsensusCommitment =
  | PreFundSetupCommitment
  | PostFundSetupCommitment
  | AppCommitment
  | ConcludeCommitment;

// Type guards
export function isAppCommitment(c: ConsensusCommitment): c is AppCommitment {
  return c.commitmentType === CommitmentType.App;
}

export function isProposal(c: ConsensusBaseCommitment) {
  return c.appAttributes.furtherVotesRequired > 0;
}
export function isConsensusReached(c: ConsensusBaseCommitment) {
  return c.appAttributes.furtherVotesRequired === 0;
}

type SolidityAppAttributes = [string, string[], string[]];
export function appAttributes(ethersAppAttrs: SolidityAppAttributes): AppAttributes {
  return {
    furtherVotesRequired: parseInt(ethersAppAttrs[0], 10),
    proposedAllocation: ethersAppAttrs[1].map(bigNumberify).map(bn => bn.toHexString()),
    proposedDestination: ethersAppAttrs[2],
  };
}

const SolidityAppAttributesType = {
  AppAttributes: {
    furtherVotesRequired: 'uint32',
    proposedAllocation: 'uint256[]',
    proposedDestination: 'address[]',
  },
};

const SolidityConsensusCommitmentType = {
  ConsensusCommitmentStruct: {
    furtherVotesRequired: 'uint32',
    currentAllocation: 'uint256[]',
    currentDestination: 'address[]',
    proposedAllocation: 'uint256[]',
    proposedDestination: 'address[]',
  },
};
type TSConsensusCommitment = [number, Uint256[], Address[], Uint256[], Address[]];

export function consensusCommitmentArgs(commitment: ConsensusCommitment): TSConsensusCommitment {
  return [
    commitment.appAttributes.furtherVotesRequired,
    commitment.allocation,
    commitment.destination,
    commitment.appAttributes.proposedAllocation,
    commitment.appAttributes.proposedDestination,
  ];
}

export function bytesFromAppAttributes(appAttrs: AppAttributes): Bytes {
  return abi.encodeParameter(SolidityAppAttributesType, [
    appAttrs.furtherVotesRequired,
    appAttrs.proposedAllocation,
    appAttrs.proposedDestination,
  ]);
}

export function appAttributesFromBytes(appAttrs: Bytes): AppAttributes {
  return appAttributes(abi.decodeParameter(SolidityAppAttributesType, appAttrs));
}

export function asCoreCommitment(c: ConsensusCommitment): Commitment {
  return {
    ...c,
    appAttributes: bytesFromAppAttributes(c.appAttributes),
  };
}

// Transition helper functions

const consensusAtts: () => AppAttributes = () => ({
  proposedAllocation: [],
  proposedDestination: [],
  furtherVotesRequired: 0,
});

function nextAppCommitment(c: AppCommitment): AppCommitment {
  return {
    ...c,
    turnNum: c.turnNum + 1,
    commitmentCount: 0,
  };
}

export function initialConsensus(c: {
  channel: Channel;
  turnNum: number;
  allocation: string[];
  destination: string[];
  commitmentCount: number;
}): AppCommitment {
  return {
    ...c,
    commitmentType: CommitmentType.App,
    appAttributes: consensusAtts(),
  };
}
export function propose(
  commitment: AppCommitment,
  proposedAllocation: Uint256[],
  proposedDestination: Address[],
): AppCommitment {
  const numParticipants = commitment.channel.participants.length;
  return {
    ...nextAppCommitment(commitment),
    appAttributes: {
      proposedAllocation,
      proposedDestination,
      furtherVotesRequired: numParticipants - 1,
    },
  };
}

export function pass(commitment: AppCommitment): AppCommitment {
  return {
    ...nextAppCommitment(commitment),
    appAttributes: consensusAtts(),
  };
}

export function vote(commitment: AppCommitment): AppCommitment {
  if (commitment.appAttributes.furtherVotesRequired <= 1) {
    throw new Error('Invalid input -- furtherVotesRequired must be greater than 1');
  }

  return {
    ...nextAppCommitment(commitment),
    appAttributes: {
      ...commitment.appAttributes,
      furtherVotesRequired: commitment.appAttributes.furtherVotesRequired - 1,
    },
  };
}

export function finalVote(commitment: AppCommitment): AppCommitment {
  if (commitment.appAttributes.furtherVotesRequired !== 1) {
    throw new Error('Invalid input -- furtherVotesRequired must be 1');
  }

  return {
    ...nextAppCommitment(commitment),
    allocation: commitment.appAttributes.proposedAllocation,
    destination: commitment.appAttributes.proposedDestination,
    appAttributes: consensusAtts(),
  };
}

export function veto(commitment: AppCommitment): AppCommitment {
  return {
    ...nextAppCommitment(commitment),
    appAttributes: consensusAtts(),
  };
}
