import {encodeConsensusData, ConsensusData} from './consensus-data';
import {encodeOutcome, Outcome} from './outcome';
import ConsensusAppArtifact from '../../build/contracts/ConsensusApp.json';
import {ethers} from 'ethers';
import {VariablePart} from './state';

const ConsensusAppContractInterface = new ethers.utils.Interface(ConsensusAppArtifact.abi);

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
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
): Promise<boolean> {
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works
  const signer = provider.getSigner(0);
  const contract = new ethers.Contract(contractAddress, ConsensusAppContractInterface.abi, signer);
  return await contract.functions.validTransition(
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  );
}
