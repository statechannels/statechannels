import {
  CommitmentType,
  Uint32,
  Uint256,
  Address,
  Bytes,
  BaseCommitment,
  ethereumArgs,
  Commitment,
  Channel,
} from 'fmg-core';
import abi from 'web3-eth-abi';
import { bigNumberify } from 'ethers/utils';

export enum UpdateType {
  Consensus,
  Proposal,
}
export interface AppAttributes {
  furtherVotesRequired: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
  updateType: UpdateType;
}

export interface ConsensusBaseCommitment extends BaseCommitment {
  furtherVotesRequired: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
  updateType: UpdateType;
}

export interface ProposalCommitment extends ConsensusBaseCommitment {
  updateType: UpdateType.Proposal;
}

export interface ConsensusReachedCommitment extends ConsensusBaseCommitment {
  updateType: UpdateType.Consensus;
}

function preFundSetupCommitment(opts: ConsensusBaseCommitment) {
  return {
    ...opts,
    commitmentType: CommitmentType.PreFundSetup,
    appAttributes: bytesFromAppAttributes(opts),
  };
}

function postFundSetupCommitment(opts: ConsensusBaseCommitment) {
  return {
    ...opts,
    commitmentType: CommitmentType.PostFundSetup,
    appAttributes: bytesFromAppAttributes(opts),
  };
}

function appCommitment(opts: ConsensusBaseCommitment) {
  return {
    ...opts,
    commitmentType: CommitmentType.App,
    appAttributes: bytesFromAppAttributes(opts),
  };
}

function concludeCommitment(opts: ConsensusBaseCommitment) {
  return {
    ...opts,
    commitmentType: CommitmentType.Conclude,
    appAttributes: bytesFromAppAttributes(opts),
  };
}

export const commitments = {
  preFundSetupCommitment,
  postFundSetupCommitment,
  appCommitment,
  concludeCommitment,
};

export function appAttributes(
  consensusCommitmentArgs: [string, string[], string[], string],
): AppAttributes {
  return {
    furtherVotesRequired: parseInt(consensusCommitmentArgs[0], 10),
    proposedAllocation: consensusCommitmentArgs[1].map(bigNumberify).map(bn => bn.toHexString()),
    proposedDestination: consensusCommitmentArgs[2],
    updateType: parseInt(consensusCommitmentArgs[3], 10),
  };
}

const SolidityConsensusCommitmentType = {
  ConsensusCommitmentStruct: {
    furtherVotesRequired: 'uint32',
    proposedAllocation: 'uint256[]',
    proposedDestination: 'address[]',
    updateType: 'uint32',
  },
};

export function bytesFromAppAttributes(appAttrs: AppAttributes): Bytes {
  return abi.encodeParameter(SolidityConsensusCommitmentType, [
    appAttrs.furtherVotesRequired,
    appAttrs.proposedAllocation,
    appAttrs.proposedDestination,
    appAttrs.updateType,
  ]);
}

export function appAttributesFromBytes(appAttrs: Bytes): AppAttributes {
  return appAttributes(abi.decodeParameter(SolidityConsensusCommitmentType, appAttrs));
}

// Transition helper functions
export function initialConsensus(opts: {
  channel: Channel;
  turnNum: number;
  allocation: string[];
  destination: string[];
  commitmentCount: number;
}): ConsensusReachedCommitment {
  return {
    ...opts,
    proposedAllocation: [],
    proposedDestination: [],
    updateType: UpdateType.Consensus,
    furtherVotesRequired: 0,
  };
}
export function propose(
  commitment: ConsensusReachedCommitment,
  proposedAllocation: Uint256[],
  proposedDestination: Address[],
): ProposalCommitment {
  const numParticipants = commitment.channel.participants.length;
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    proposedAllocation,
    proposedDestination,
    updateType: UpdateType.Proposal,
    furtherVotesRequired: numParticipants - 1,
  };
}

export function pass(commitment: ConsensusReachedCommitment): ConsensusReachedCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    updateType: UpdateType.Consensus,
  };
}

export function vote(commitment: ProposalCommitment): ProposalCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    furtherVotesRequired: commitment.furtherVotesRequired - 1,
  };
}

export function finalVote(commitment: ProposalCommitment): ConsensusReachedCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    updateType: UpdateType.Consensus,
    allocation: commitment.proposedAllocation,
    destination: commitment.proposedDestination,
    proposedAllocation: [],
    proposedDestination: [],
  };
}

export function veto(commitment: ProposalCommitment): ConsensusReachedCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    updateType: UpdateType.Consensus,
    proposedAllocation: [],
    proposedDestination: [],
  };
}

export function proposeAlternative(
  commitment: ProposalCommitment,
  proposedAllocation: Uint256[],
  proposedDestination: Address[],
): ProposalCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    proposedAllocation,
    proposedDestination,
    updateType: UpdateType.Proposal,
  };
}
