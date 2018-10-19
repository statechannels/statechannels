import { Reducer } from 'redux';
import { SetChallenge, ClearChallenge,SET_CHALLENGE, CLEAR_CHALLENGE, SET_CHALLENGE_STATUS, SetChallengeStatus } from '../actions/challenge';

export type ChallengeState = any;

const initialState = {};

type ChallengeAction = SetChallenge | ClearChallenge | SetChallengeStatus;
export const challengeReducer: Reducer<ChallengeState> = (state=initialState, action: ChallengeAction) => {
  switch (action.type) {
    case SET_CHALLENGE:
      const { responseOptions, expirationTime, status } = action;
      return { responseOptions, expirationTime,status };
      case SET_CHALLENGE_STATUS:
      return {...state, status:action.status} ;
  case CLEAR_CHALLENGE:
      return {};
    default:
      return state;
  }
};
