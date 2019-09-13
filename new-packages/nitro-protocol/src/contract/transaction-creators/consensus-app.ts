import {TransactionRequest} from 'ethers/providers';
import ConsensusAppArtifact from '../../../build/contracts/ConsensusApp.json';
import {ethers} from 'ethers';
import {ConsensusData} from '../consensus-data';
import {Outcome} from '../outcome';
import {getVariablePart} from '../consensus-app';

// TODO: Currently we are setting some arbitrary gas limit
// to avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

const ConsensusAppContractInterface = new ethers.utils.Interface(ConsensusAppArtifact.abi);

export function createValidTransitionTransaction(
  fromConsensusData: ConsensusData,
  fromOutcome: Outcome,
  toConsensusData: ConsensusData,
  toOutcome: Outcome,
  numberOfParticipants: number,
): TransactionRequest {
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works
  const data = ConsensusAppContractInterface.functions.validTransition.encode([
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  ]);

  return {data, gasLimit: GAS_LIMIT};
}
