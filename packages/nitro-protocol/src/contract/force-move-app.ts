import {Contract, Signer} from 'ethers';
import {Interface} from 'ethers/utils';
import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {getVariablePart} from '../contract/state';
import {State} from './state';

const ForceMoveAppContractInterface = new Interface(ForceMoveAppArtifact.abi);

export async function validTransition(
  fromState: State,
  toState: State,
  forceMoveAppAddress: string,
  signer: Signer
): Promise<boolean> {
  const numberOfParticipants = toState.channel.participants.length;
  const fromVariablePart = getVariablePart(fromState);
  const toVariablePart = getVariablePart(toState);
  const turnNumB = toState.turnNum;

  const contract = new Contract(forceMoveAppAddress, ForceMoveAppContractInterface.abi, signer);
  return await contract.functions.validTransition(
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants
  );
}
