import {utils, Contract} from 'ethers';
import {TransactionRequest} from 'ethers/providers';

import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {State, getVariablePart} from '../contract/state';

// @ts-ignore https://github.com/ethers-io/ethers.js/issues/602#issuecomment-574671078
export const ForceMoveAppContractInterface = new utils.Interface(ForceMoveAppArtifact.abi);

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

export function createValidTransitionTransaction(fromState: State, toState: State): {data: string} {
  const numberOfParticipants = toState.channel.participants.length;
  const fromVariablePart = getVariablePart(fromState);
  const toVariablePart = getVariablePart(toState);
  const turnNumB = toState.turnNum;
  const data = ForceMoveAppContractInterface.functions.validTransition.encode([
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  ]);
  return {data};
}
