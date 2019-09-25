import {
  AdjudicatorState,
  clearChallenge,
  markAsFinalized,
  setBalance,
  setChallenge,
} from './state';
import * as actions from '../actions';
import { unreachable } from '../../utils/reducer-utils';

export const adjudicatorStateReducer = (
  state: AdjudicatorState,
  action: actions.AdjudicatorEventAction | actions.ChallengeCreatedEvent,
): AdjudicatorState => {
  switch (action.type) {
    case 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED':
      return challengeExpiredReducer(state, action);
    case 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT':
      return fundingReceivedEventReducer(state, action);
    case 'WALLET.ADJUDICATOR.CONCLUDED_EVENT':
      return concludedEventReducer(state, action);
    case 'WALLET.ADJUDICATOR.REFUTED_EVENT':
    case 'WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT':
      return challengeRespondedReducer(state, action);
    case 'WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT':
      return challengeCreatedEventReducer(state, action);
    case 'WALLET.ADJUDICATOR.CHANNEL_UPDATE':
      return channelUpdateReducer(state, action);
    case 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET':
      // We already handle this in the challenge created event
      return state;
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
  return setBalance(state, channelId, action.totalForDestination);
};
const channelUpdateReducer = (state: AdjudicatorState, action: actions.ChannelUpdate) => {
  const { channelId } = action;
  let updatedState = setBalance(state, channelId, action.balance);
  if (action.isFinalized) {
    updatedState = markAsFinalized(updatedState, channelId);
  }
  return updatedState;
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
