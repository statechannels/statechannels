import {Reducer} from 'redux';
import {MetamaskAction} from './actions';
import {MetamaskState} from './state';

const initialState: MetamaskState = {};

export const metamaskReducer: Reducer<MetamaskState> = (
  state: MetamaskState = initialState,
  action: MetamaskAction
) => {
  switch (action.type) {
    case 'NetworkChanged': {
      return {...state, network: action.network};
    }
    default:
      return state;
  }
};
