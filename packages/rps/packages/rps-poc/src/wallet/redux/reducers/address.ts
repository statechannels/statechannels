import { Reducer } from 'redux';
import * as actions from '../actions/external';

export type AddressState = string | null;
const initialState = null;

export const addressReducer: Reducer<AddressState> = (state=initialState, action: actions.InitializationSuccess) => {
  switch (action.type) {
    case actions.INITIALIZATION_SUCCESS:
      return action.address;
    default:
      return state;
  }
};
