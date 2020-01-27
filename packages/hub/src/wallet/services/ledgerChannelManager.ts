import {
  SignedState,
  State,
  ConsensusData,
  decodeConsensusData,
  encodeConsensusData
} from '@statechannels/nitro-protocol';
import {HUB_ADDRESS} from '../../constants';
import {queries} from '../db/queries/channels';
import errors from '../errors';
import * as ChannelManager from './channelManager';

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
  statesToApply.sort((a, b) => a.state.turnNum - b.state.turnNum);

  let lastValidState = lastStoredState;
  for (const stateToApply of statesToApply) {
    if (!shouldAcceptState(stateToApply, lastValidState)) {
      throw errors.INVALID_STATE_UNKNOWN_REASON;
    }
    lastValidState = stateToApply.state;
  }

  const ourState = nextState(statesToApply);
  const stateToStore = statesToApply.map(signedState => signedState.state);
  // Todo: signatures need to be stored alongside states
  await queries.updateChannel(stateToStore, ourState);
  return ChannelManager.formResponse(ourState);
}

function shouldAcceptState(signedState: SignedState, previousState?: State) {
  const {state: state, signature} = signedState;
  if (!ChannelManager.validSignature(state, signature)) {
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

  if (!ChannelManager.isApplicationState(lastState)) {
    return ChannelManager.nextState(lastState);
  }

  const consensusData = decodeConsensusData(lastState.appData);
  if (finalVoteRequired(consensusData)) {
    return finalVote(lastState);
  } else if (voteRequired(consensusData)) {
    return vote(lastState);
  } else if (isConsensusReached(consensusData)) {
    return pass(lastState);
  } else {
    throw new Error('Unknown consensus state');
  }
}

function finalVoteRequired(cd: ConsensusData): boolean {
  return cd.furtherVotesRequired === 1;
}

function voteRequired(cd: ConsensusData): boolean {
  return cd.furtherVotesRequired > 1;
}

function isConsensusReached(cd: ConsensusData): boolean {
  return cd.furtherVotesRequired === 0;
}

function nextAppState(s: State): State {
  return {
    ...s,
    turnNum: s.turnNum + 1
  };
}

function finalVote(state: State): State {
  const consensusData: ConsensusData = decodeConsensusData(state.appData);
  return {
    ...nextAppState(state),
    outcome: consensusData.proposedOutcome,
    appData: encodeConsensusData({proposedOutcome: [], furtherVotesRequired: 0})
  };
}

function vote(state: State): State {
  const consensusData: ConsensusData = decodeConsensusData(state.appData);
  return {
    ...nextAppState(state),
    appData: encodeConsensusData({
      ...consensusData,
      furtherVotesRequired: consensusData.furtherVotesRequired - 1
    })
  };
}

function pass(state: State): State {
  return {
    ...nextAppState(state),
    appData: encodeConsensusData({proposedOutcome: [], furtherVotesRequired: 0})
  };
}

export function valuePreserved(currentState: any, theirState: any): boolean {
  return currentState || (theirState && true);
}

export function validTransition(currentState: State, theirState: State): boolean {
  return theirState.turnNum === currentState.turnNum + 1;
}
