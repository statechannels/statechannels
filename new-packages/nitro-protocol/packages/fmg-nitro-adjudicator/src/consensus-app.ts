import { Commitment, CommitmentType, Uint32, Uint256, Address, Bytes, BaseCommitment } from 'fmg-core';
import abi from 'web3-eth-abi';

interface AppAttributes {
  consensusCounter: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
}

export interface ConsensusCommitment extends BaseCommitment {
  consensusCounter: Uint32;
  proposedAllocation: Uint256[];
  proposedDestination: Address[];
}

export function asCoreCommitment(consensusCommitment: ConsensusCommitment) {
  return { ...consensusCommitment, appAttributes: bytesFromAppAttributes(consensusCommitment) };
}

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