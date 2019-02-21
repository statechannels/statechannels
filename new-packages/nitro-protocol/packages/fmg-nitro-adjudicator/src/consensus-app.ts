import { Commitment, CommitmentType, Uint32, Uint256, Address, Bytes, BaseCommitment } from 'fmg-core';
import abi from 'web3-eth-abi';

interface AppAttributes {
  consensusCounter: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
}

interface ConsensusBaseCommitment extends BaseCommitment {
  consensusCounter: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
}

function preFundSetupCommitment(opts: ConsensusBaseCommitment) {
  return { ...opts, commitmentType: CommitmentType.PreFundSetup, appAttributes: bytesFromAppAttributes(opts) };
}

function postFundSetupCommitment(opts: ConsensusBaseCommitment) {
  return { ...opts, commitmentType: CommitmentType.PostFundSetup, appAttributes: bytesFromAppAttributes(opts) };
}

function appCommitment(opts: ConsensusBaseCommitment) {
  return { ...opts, commitmentType: CommitmentType.App, appAttributes: bytesFromAppAttributes(opts) };
}

function concludeCommitment(opts: ConsensusBaseCommitment) {
  return { ...opts, commitmentType: CommitmentType.Conclude, appAttributes: bytesFromAppAttributes(opts) };
}

export const commitments = {
  preFundSetupCommitment,
  postFundSetupCommitment,
  appCommitment,
  concludeCommitment,
};

export function appAttributes(consensusCommitmentArgs: [Uint32, Uint256[], Address[]]): AppAttributes {
  //
  return {
    consensusCounter: consensusCommitmentArgs[0],
    proposedAllocation: consensusCommitmentArgs[1],
    proposedDestination: consensusCommitmentArgs[2],
  };
}

const SolidityConsensusCommitmentType = {
  "ConsensusCommitmentStruct": {
    "consensusCounter": "uint32",
    "proposedAllocation": "uint256[]",
    "proposedDestination": "address[]",
  },
};

export function bytesFromAppAttributes(appAttrs: AppAttributes): Bytes {
  return abi.encodeParameter(SolidityConsensusCommitmentType, [appAttrs.consensusCounter, appAttrs.proposedAllocation, appAttrs.proposedDestination]);
}