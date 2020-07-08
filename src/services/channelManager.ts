import { SERVER_PRIVATE_KEY } from '../constants';
import { logger as log } from '../logger';
import { State, SignedState } from '../store-types';
import { signState } from '../state-utils';

export function isApplicationState(state: State): boolean {
  const isSetup: boolean = state.turnNum < state.participants.length * 2;
  return !isSetup && !state.isFinal;
}

export function validSignature(state: SignedState): boolean {
  log.warn('Signature not validated');
  return state && state.signatures[0] && true;
  // Return recover(toHex(commitment), signature) === mover(commitment);
}

export function formResponse(state: State): SignedState {
  return {
    ...state,
    signatures: [signState(state, SERVER_PRIVATE_KEY)]
  };
}

export function nextState(theirState: State): State {
  if (isApplicationState(theirState)) {
    throw new Error('State has to be a prefund setup, postfund setup or final state');
  }

  const ourState = { ...theirState, turnNum: theirState.turnNum + 1 };
  return ourState;
}
