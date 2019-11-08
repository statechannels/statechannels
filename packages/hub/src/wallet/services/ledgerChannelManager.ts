import {SignedState, State} from '@statechannels/nitro-protocol';
import {HUB_ADDRESS} from '../../constants';
import {queries} from '../db/queries/channels';
import errors from '../errors';
import * as ChannelManagement from './channelManagement';

export async function updateLedgerChannel(
  stateRound: SignedState[],
  lastStoredState?: State
): Promise<SignedState> {
  let statesToApply = stateRound;
  if (lastStoredState) {
    statesToApply = stateRound.filter(
      signedState => signedState.state.turnNum > lastStoredState.turnNum
    );
  }
  statesToApply.sort((a, b) => {
    return a.state.turnNum - b.state.turnNum;
  });

  let lastValidState = lastStoredState;
  for (const stateToApply of statesToApply) {
    if (!shouldAcceptState(stateToApply, lastValidState)) {
      throw errors.INVALID_STATE_UNKNOWN_REASON;
    }
    lastValidState = stateToApply.state;
  }

  const ourState = nextState(statesToApply);
  const stateToStore = statesToApply.map(signedState => signedState.state);
  // todo: signatures need to be stored alongside states
  await queries.updateChannel(stateToStore, ourState);
  return ChannelManagement.formResponse(ourState);
}

function shouldAcceptState(signedState: SignedState, previousState?: State) {
  const {state: state, signature} = signedState;
  if (!ChannelManagement.validSignature(state, signature)) {
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
  // Check that it is our turn
  const lastState = stateRound.slice(-1)[0].state;
  const participants = lastState.channel.participants;
  const ourIndex = participants.indexOf(HUB_ADDRESS);
  const lastTurn = lastState.turnNum;
  const numParticipants = participants.length;
  if ((lastTurn + 1) % numParticipants !== ourIndex) {
    throw errors.NOT_OUR_TURN;
  }

  return ChannelManagement.nextState(lastState);
  // todo: form response during funding
  /*if (lastCommitmnent.commitmentType !== CommitmentType.App) {
    return ChannelManagement.nextState(lastCommitmnent) as State;
  }*/

  // todo: refactor consensus app logic
  /*
  if (finalVoteRequired(lastState)) {
    return finalVote(lastState);
  } else if (voteRequired(lastState)) {
    return vote(lastState);
  } else if (isConsensusReached(lastState)) {
    return pass(lastState);
  } else {
    return unreachable(lastState);
  }*/
}

// todo: a better check is a typeguard
/*function finalVoteRequired(s: State): boolean {
  return decodeConsensusData(s.appData).furtherVotesRequired === 1;
}*/

// todo: a better check is a typeguard
/*function voteRequired(s: State): boolean {
  return decodeConsensusData(s.appData).furtherVotesRequired > 1;
}*/

export function valuePreserved(currentState: any, theirState: any): boolean {
  return currentState || (theirState && true);
}

export function validTransition(currentState: State, theirState: State): boolean {
  return theirState.turnNum === currentState.turnNum + 1;
}
