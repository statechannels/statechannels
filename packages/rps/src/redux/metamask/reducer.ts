import {Reducer} from 'redux';
import {MetamaskAction} from './actions';
import {MetamaskState} from './state';

const initialState: MetamaskState = {
  loading: false,
  accounts: [],
};

export const metamaskReducer: Reducer<MetamaskState> = (
  state: MetamaskState = initialState,
  action: MetamaskAction
) => {
  const accountsExistsFromState = state.accounts[0];

  switch (action.type) {
    case 'NetworkChanged': {
      return {...state, network: action.network};
    }
    case 'AccountsChanged': {
      const accountsExistsFromAction = action.accounts[0];
      return {
        ...state,
        accounts: action.accounts,
        loading: accountsExistsFromAction ? false : state.loading,
      };
    }
    case 'Enable': {
      return {...state, loading: accountsExistsFromState ? false : true};
    }
    default:
      return state;
  }
};
