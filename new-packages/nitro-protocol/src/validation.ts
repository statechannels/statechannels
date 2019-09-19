import {SignedState} from '.';
import {ethers} from 'ethers';
import * as forceMoveApp from './contract/force-move-app';

export async function validTransition(
  signer: ethers.Signer,
  newState: SignedState,
  previousState?: SignedState,
): Promise<boolean> {
  if (!previousState) {
    return true; // Allows validTransition to be called without the caller inspecting how many previous states there are
  }

  const appAddress = previousState.state.appDefinition;
  return await forceMoveApp.validTransition(
    previousState.state,
    newState.state,
    appAddress,
    signer,
  );
}
