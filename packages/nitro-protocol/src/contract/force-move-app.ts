import {Interface} from 'ethers/utils';

import {Contract} from 'ethers';
import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {State, getVariablePart} from '../contract/state';

export const ForceMoveAppContractInterface = new Interface(ForceMoveAppArtifact.abi);

export async function validTransition(
  fromState: State,
  toState: State,
  appContract: Contract
): Promise<boolean> {
  const numberOfParticipants = toState.channel.participants.length;
  const fromVariablePart = getVariablePart(fromState);
  const toVariablePart = getVariablePart(toState);
  const turnNumB = toState.turnNum;

  return await appContract.functions.validTransition(
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants
  );
}
