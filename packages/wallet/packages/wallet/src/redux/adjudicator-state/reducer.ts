import {
  AdjudicatorState,
  clearChallenge,
  markAsFinalized,
  addToBalance,
  setChallenge,
} from './state';
import * as actions from '../actions';
import { unreachable } from '../../utils/reducer-utils';

export const adjudicatorStateReducer = (
  state: AdjudicatorState,
  action: actions.AdjudicatorEventAction | actions.ChallengeCreatedEvent,
) => {
  switch (action.type) {
    case actions.CHALLENGE_EXPIRED_EVENT:
      return challengeExpiredReducer(state, action);
    case actions.FUNDING_RECEIVED_EVENT:
      return fundingReceivedEventReducer(state, action);
    case actions.CONCLUDED_EVENT:
      return concludedEventReducer(state, action);
    case actions.REFUTED_EVENT:
    case actions.RESPOND_WITH_MOVE_EVENT:
      return challengeRespondedReducer(state, action);
    case actions.CHALLENGE_CREATED_EVENT:
      return challengeCreatedEventReducer(state, action);
    default:
      return unreachable(action);
  }
};

const challengeCreatedEventReducer = (
  state: AdjudicatorState,
  action: actions.ChallengeCreatedEvent,
) => {
  const challenge = { expiresAt: action.finalizedAt, challengeCommitment: action.commitment };
  return setChallenge(state, action.channelId, challenge);
};

const challengeRespondedReducer = (
  state: AdjudicatorState,
  action: actions.RefutedEvent | actions.RespondWithMoveEvent,
) => {
  const { channelId } = action;
  return clearChallenge(state, channelId);
};

const concludedEventReducer = (state: AdjudicatorState, action: actions.ConcludedEvent) => {
  const { channelId } = action;
  return markAsFinalized(state, channelId);
};
const fundingReceivedEventReducer = (
  state: AdjudicatorState,
  action: actions.FundingReceivedEvent,
) => {
  const { channelId } = action;
  addToBalance(state, channelId, action.amount);
};

const challengeExpiredReducer = (
  state: AdjudicatorState,
  action: actions.ChallengeExpiredEvent,
) => {
  let newState = { ...state };
  const { channelId } = action;
  newState = clearChallenge(newState, channelId);
  newState = markAsFinalized(newState, channelId);

  return newState;
};
