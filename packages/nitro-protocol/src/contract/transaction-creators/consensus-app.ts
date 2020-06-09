import {providers} from 'ethers';
import {Interface} from 'ethers/utils';
import ConsensusAppArtifact from '../../../build/contracts/ConsensusApp.json';
import {getVariablePart} from '../consensus-app';
import {ConsensusData} from '../consensus-data';
import {Outcome} from '../outcome';

// Ethers mis-interprets the artifact's abi paramter so we cast to any
const ConsensusAppContractInterface = new Interface(ConsensusAppArtifact.abi as any);

export function createValidTransitionTransaction(
  fromConsensusData: ConsensusData,
  fromOutcome: Outcome,
  toConsensusData: ConsensusData,
  toOutcome: Outcome,
  numberOfParticipants: number
): providers.TransactionRequest {
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works
  const data = ConsensusAppContractInterface.functions.validTransition.encode([
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  ]);

  return {data};
}
