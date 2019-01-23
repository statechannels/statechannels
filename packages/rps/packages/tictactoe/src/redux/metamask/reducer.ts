import { Reducer } from 'redux';
import * as metamaskActions from './actions';

export interface MetamaskState {
  loading: boolean;
  error: metamaskActions.MetamaskError | null;
  success: boolean;
}

const initialState: MetamaskState = {
  loading: true,
  error: null,
  success: false,
};

export const metamaskReducer: Reducer<MetamaskState> = (
  state = initialState,
  action: metamaskActions.MetamaskResponse,
) => {
  switch (action.type) {
    case metamaskActions.METAMASK_SUCCESS: {
      return {
        success: true,
        loading: false,
        error: null,
      };
    }
    case metamaskActions.METAMASK_ERROR: {
      return {
        success: false,
        loading: false,
        error: action.error,
      };
    }
    default:
      return state;
  }
};
