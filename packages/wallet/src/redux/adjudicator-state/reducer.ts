import * as actions from "../actions";
import {unreachable} from "../../utils/reducer-utils";

import {AdjudicatorState, clearChallenge, markAsFinalized, setChallenge} from "./state";

export const adjudicatorStateReducer = (
  state: AdjudicatorState,
  action: actions.AdjudicatorEventAction
): AdjudicatorState => {
  switch (action.type) {
    case "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED":
      return challengeExpiredReducer(state, action);
    case "WALLET.ADJUDICATOR.CONCLUDED_EVENT":
      return concludedEventReducer(state, action);
    case "WALLET.ADJUDICATOR.REFUTED_EVENT":
    case "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT":
      return challengeRespondedReducer(state, action);
    case "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT":
      return challengeCreatedEventReducer(state, action);
    case "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT":
      return challengeClearedEventReducer(state, action);
    case "WALLET.ADJUDICATOR.CHANNEL_UPDATE":
      return channelUpdateReducer(state, action);
    case "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET":
      // We already handle this in the challenge created event
      return state;
    default:
      return unreachable(action);
  }
};

const challengeCreatedEventReducer = (
  state: AdjudicatorState,
  action: actions.ChallengeCreatedEvent
) => {
  const challenge = {expiresAt: action.finalizedAt, challengeStates: action.challengeStates};
  return setChallenge(state, action.channelId, challenge);
};

const challengeClearedEventReducer = (
  state: AdjudicatorState,
  action: actions.ChallengeClearedEvent
) => {
  const {channelId} = action;
  return clearChallenge(state, channelId);
};

// TODO: remove this responder reducer
const challengeRespondedReducer = (
  state: AdjudicatorState,
  action: actions.RefutedEvent | actions.RespondWithMoveEvent
) => {
  const {channelId} = action;
  return clearChallenge(state, channelId);
};

const concludedEventReducer = (state: AdjudicatorState, action: actions.ConcludedEvent) => {
  const {channelId} = action;
  return markAsFinalized(state, channelId);
};

const channelUpdateReducer = (state: AdjudicatorState, action: actions.ChannelUpdate) => {
  const {channelId} = action;
  if (action.isFinalized) {
    state = markAsFinalized(state, channelId);
  }
  return state;
};

const challengeExpiredReducer = (
  state: AdjudicatorState,
  action: actions.ChallengeExpiredEvent
) => {
  let newState = {...state};
  const {channelId} = action;
  newState = clearChallenge(newState, channelId);
  newState = markAsFinalized(newState, channelId);

  return newState;
};
