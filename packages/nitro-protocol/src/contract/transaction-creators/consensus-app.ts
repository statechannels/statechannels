import {ethers} from 'ethers';

import ConsensusAppArtifact from '../../../build/contracts/ConsensusApp.json';
import {getVariablePart} from '../consensus-app';
import {ConsensusData} from '../consensus-data';
import {Outcome} from '../outcome';

// Ethers mis-interprets the artifact's abi paramter so we cast to any
const ConsensusAppContractInterface = new ethers.utils.Interface(ConsensusAppArtifact.abi as any);

export function createValidTransitionTransaction(
  fromConsensusData: ConsensusData,
  fromOutcome: Outcome,
  toConsensusData: ConsensusData,
  toOutcome: Outcome,
  numberOfParticipants: number
): ethers.providers.TransactionRequest {
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works
  const data = ConsensusAppContractInterface.encodeFunctionData('validTransition', [
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  ]);

  return {data};
}
