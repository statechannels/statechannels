import {Contract, Signer, utils} from 'ethers';

import ConsensusAppArtifact from '../../build/contracts/ConsensusApp.json';

import {ConsensusData, encodeConsensusData} from './consensus-data';
import {encodeOutcome, Outcome} from './outcome';
import {VariablePart} from './state';

export function getVariablePart(consensusData: ConsensusData, outcome: Outcome): VariablePart {
  const appData = encodeConsensusData(consensusData);
  return {appData, outcome: encodeOutcome(outcome)};
}

// validTransition is a pure function so using this method will not use gas
// This should be used over createValidTransitionTransaction
export async function validTransition(
  fromConsensusData: ConsensusData,
  fromOutcome: Outcome,
  toConsensusData: ConsensusData,
  toOutcome: Outcome,
  numberOfParticipants: number,
  signer: Signer,
  contractAddress: string
): Promise<boolean> {
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works

  const contract = new Contract(contractAddress, ConsensusAppArtifact.abi, signer);
  return await contract.validTransition(
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants
  );
}
