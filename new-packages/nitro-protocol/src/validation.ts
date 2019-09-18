import {SignedState} from '.';
import {ethers} from 'ethers';
import * as forceMoveApp from './contract/force-move-app';

export async function validTransition(
  signer: ethers.Signer,
  newState: SignedState,
  previousStates: SignedState[],
): Promise<boolean> {
  if (previousStates.length === 0) {
    return true; // Allows validTransition to be called without the caller inspecting how many previous states there are
  }
  const lastState = previousStates[previousStates.length - 1];
  const appAddress = lastState.state.appDefinition;
  return await forceMoveApp.validTransition(lastState.state, newState.state, appAddress, signer);
}
