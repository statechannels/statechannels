import { types } from '../actions/wallet';

const initialState = {
};

export default function loginReducer(state = initialState, action = {}) {
  switch (action.type) {
    case types.SYNC_WALLET:
      return action.wallet || initialState;
    default:
      return state;
  }
};
