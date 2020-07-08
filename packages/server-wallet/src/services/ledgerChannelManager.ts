import {queries} from '../db/queries/channels';
import errors from '../errors';
import * as ChannelManager from './channelManager';
import {SignedState, State} from '../store-types';

export async function updateLedgerChannel(
  stateRound: SignedState[],
  lastStoredState?: State
): Promise<SignedState> {
  let statesToApply = stateRound;
  if (lastStoredState) {
    statesToApply = stateRound.filter(signedState => signedState.turnNum > lastStoredState.turnNum);
  }
  statesToApply.sort((a, b) => a.turnNum - b.turnNum);

  let lastValidState = lastStoredState;
  for (const stateToApply of statesToApply) {
    if (!shouldAcceptState(stateToApply, lastValidState)) {
      throw errors.INVALID_STATE_UNKNOWN_REASON;
    }
    lastValidState = stateToApply;
  }

  const ourState = nextState(statesToApply);
  await queries.updateChannel(statesToApply, ourState);
  return ChannelManager.formResponse(ourState);
}

function shouldAcceptState(state: SignedState, previousState?: State) {
  if (!ChannelManager.validSignature(state)) {
    throw errors.STATE_NOT_SIGNED;
  }

  if (state.turnNum > 0) {
    if (!valuePreserved(previousState, state)) {
      throw errors.VALUE_LOST;
    }

    if (!validTransition(previousState, state)) {
      throw errors.INVALID_TRANSITION;
    }
  }
  return true;
}

export function nextState(stateRound: SignedState[]): State {
  return ChannelManager.nextState(stateRound.slice(-1)[0]);
}

export function valuePreserved(currentState: any, theirState: any): boolean {
  return currentState || (theirState && true);
}

export function validTransition(currentState: State, theirState: State): boolean {
  return theirState.turnNum === currentState.turnNum + 1;
}
