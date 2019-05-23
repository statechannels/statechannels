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
export interface ProposalAppAttrs extends AppAttributes {
  updateType: UpdateType.Proposal;
}
export interface ConsensusAppAttrs extends AppAttributes {
  updateType: UpdateType.Consensus;
}

export interface ConsensusBaseCommitment extends BaseCommitment {
  appAttributes: AppAttributes;
}

export interface ProposalCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.App;
  appAttributes: ProposalAppAttrs;
}
export interface ConsensusReachedCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.App;
  appAttributes: ConsensusAppAttrs;
}
export interface PreFundSetupCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.PreFundSetup;
}
export interface PostFundSetupCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.PostFundSetup;
}
export type AppCommitment = ProposalCommitment | ConsensusReachedCommitment;
export interface ConcludeCommitment extends ConsensusBaseCommitment {
  commitmentType: CommitmentType.Conclude;
}

export type ConsensusCommitment =
  | PreFundSetupCommitment
  | AppCommitment
  | PostFundSetupCommitment
  | ConcludeCommitment;

// Type guards
export function isProposal(c: ConsensusBaseCommitment): c is ProposalCommitment {
  return c.appAttributes.updateType === UpdateType.Proposal;
}
export function isConsensusReached(c: ConsensusBaseCommitment): c is ConsensusReachedCommitment {
  return c.appAttributes.updateType === UpdateType.Consensus;
}
export function isAppCommitment(c: ConsensusBaseCommitment): c is AppCommitment {
  return isProposal(c) || isConsensusReached(c);
}

export function appAttributes(
  ethersAppAttrs: [string, string[], string[], string],
): ConsensusAppAttrs | ProposalAppAttrs {
  return {
    furtherVotesRequired: parseInt(ethersAppAttrs[0], 10),
    proposedAllocation: ethersAppAttrs[1].map(bigNumberify).map(bn => bn.toHexString()),
    proposedDestination: ethersAppAttrs[2],
    updateType: parseInt(ethersAppAttrs[3], 10),
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

export function appAttributesFromBytes(appAttrs: Bytes): ConsensusAppAttrs | ProposalAppAttrs {
  return appAttributes(abi.decodeParameter(SolidityConsensusCommitmentType, appAttrs));
}

export function asCoreCommitment(c: ConsensusCommitment): Commitment {
  return {
    ...c,
    appAttributes: bytesFromAppAttributes(c.appAttributes),
  };
}

// Transition helper functions

const consensusAtts: () => ConsensusAppAttrs = () => ({
  proposedAllocation: [],
  proposedDestination: [],
  updateType: UpdateType.Consensus,
  furtherVotesRequired: 0,
});

export function initialConsensus(c: {
  channel: Channel;
  turnNum: number;
  allocation: string[];
  destination: string[];
  commitmentCount: number;
}): ConsensusReachedCommitment {
  return {
    ...c,
    commitmentType: CommitmentType.App,
    appAttributes: consensusAtts(),
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
    appAttributes: {
      proposedAllocation,
      proposedDestination,
      updateType: UpdateType.Proposal,
      furtherVotesRequired: numParticipants - 1,
    },
  };
}

export function pass(commitment: ConsensusReachedCommitment): ConsensusReachedCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    appAttributes: consensusAtts(),
  };
}

export function vote(commitment: ProposalCommitment): ProposalCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    appAttributes: {
      ...commitment.appAttributes,
      furtherVotesRequired: commitment.appAttributes.furtherVotesRequired - 1,
    },
  };
}

export function finalVote(commitment: ProposalCommitment): ConsensusReachedCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    allocation: commitment.appAttributes.proposedAllocation,
    destination: commitment.appAttributes.proposedDestination,
    appAttributes: consensusAtts(),
  };
}

export function veto(commitment: ProposalCommitment): ConsensusReachedCommitment {
  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    appAttributes: consensusAtts(),
  };
}

export function proposeAlternative(
  commitment: ProposalCommitment,
  proposedAllocation: Uint256[],
  proposedDestination: Address[],
): ProposalCommitment {
  const numParticipants = commitment.channel.participants.length;

  return {
    ...commitment,
    turnNum: commitment.turnNum + 1,
    appAttributes: {
      updateType: UpdateType.Proposal,
      furtherVotesRequired: numParticipants - 1,
      proposedAllocation,
      proposedDestination,
    },
  };
}

export { validTransition } from './validTransition';
