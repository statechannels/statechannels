import { Commitment, CommitmentType } from 'fmg-core';
import abi from 'web3-eth-abi';

interface AppAttributes {
  consensusCounter: string;
  proposedAllocation: string[];
  proposedDestination: string[];
}

function preFundSetupCommitment(opts) {
  return { ...opts, commitmentType: CommitmentType.PreFundSetup, appAttributes: appAttributesString(opts) };
}

function postFundSetupCommitment(opts) {
  return { ...opts, commitmentType: CommitmentType.PostFundSetup, appAttributes: appAttributesString(opts) };
}

function appCommitment(opts) {
  return { ...opts, commitmentType: CommitmentType.App, appAttributes: appAttributesString(opts) };
}

function concludeCommitment(opts) {
  return { ...opts, commitmentType: CommitmentType.Conclude, appAttributes: appAttributesString(opts) };
}

export const commitments = {
  preFundSetupCommitment,
  postFundSetupCommitment,
  appCommitment,
  concludeCommitment,
};

export function appAttributes(consensusCommitmentArgs: [string, string[], string[]]): AppAttributes {
  //
  return {
    consensusCounter: consensusCommitmentArgs[0],
    proposedAllocation: consensusCommitmentArgs[1],
    proposedDestination: consensusCommitmentArgs[2],
  };
}

const SolidityConsensusCommitmentType = {
  "ConsensusCommitmentStruct": {
    "consensusCounter": "uint256",
    "proposedAllocation": "uint256[]",
    "proposedDestination": "address[]",
  },
};

interface ConsensusBaseCommitment extends Commitment {
  consensusCounter: number;
  proposedAllocation: number[];
  proposedDestination: string[];
}

export function appAttributesString(commitment: ConsensusBaseCommitment): string {
  return abi.encodeParameter(SolidityConsensusCommitmentType, [commitment.consensusCounter, commitment.proposedAllocation, commitment.proposedDestination]);
}