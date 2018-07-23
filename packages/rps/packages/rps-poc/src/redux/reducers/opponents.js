import { types } from '../actions/opponents';

const initialState = [];

export default function reducer (state = initialState, action = {}) {
  switch (action.type) {
    case types.OPPONENTS.SYNC:
      return action.opponents;
    default:
      return state
  }
}