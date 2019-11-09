import {HUB_PRIVATE_KEY} from '../../constants';

import {SignedState, State} from '@statechannels/nitro-protocol';
import {signState} from '@statechannels/nitro-protocol/lib/src/signatures';
import {Signature} from 'ethers/utils';

export function validSignature(commitment: State, signature: Signature): boolean {
  console.warn('Signature not validated');
  return commitment && signature && true;
  // return recover(toHex(commitment), signature) === mover(commitment);
}

export function formResponse(state: State): SignedState {
  return signState(state, HUB_PRIVATE_KEY);
}

export function nextState(theirState: State): State {
  const ourState = {...theirState, turnNum: theirState.turnNum + 1};
  return ourState;
}
