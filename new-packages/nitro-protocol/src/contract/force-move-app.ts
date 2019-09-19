import {getVariablePart} from '../contract/state';
import {ethers} from 'ethers';
import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {State} from './state';

const ForceMoveAppContractInterface = new ethers.utils.Interface(ForceMoveAppArtifact.abi);

export async function validTransition(
  fromState: State,
  toState: State,
  forceMoveAppAddress: string,
  signer: ethers.Signer,
): Promise<boolean> {
  const numberOfParticipants = toState.channel.participants.length;
  const fromVariablePart = getVariablePart(fromState);
  const toVariablePart = getVariablePart(toState);
  const turnNumB = toState.turnNum;

  const contract = new ethers.Contract(
    forceMoveAppAddress,
    ForceMoveAppContractInterface.abi,
    signer,
  );
  return await contract.functions.validTransition(
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  );
}
