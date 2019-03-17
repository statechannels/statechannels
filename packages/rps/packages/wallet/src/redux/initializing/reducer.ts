import {
  InitializingState,
  WAIT_FOR_LOGIN,
  METAMASK_ERROR,
  waitForAdjudicator,
  WAIT_FOR_ADJUDICATOR,
  WaitForLogin,
  WaitForAdjudicator,
} from './state';
import { waitingForChannelInitialization, InitializedState } from '../state';

import { WalletAction, LOGGED_IN, ADJUDICATOR_KNOWN } from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { initializationSuccess } from 'magmo-wallet-client/lib/wallet-events';

export const initializingReducer = (
  state: InitializingState,
  action: WalletAction,
): InitializingState | InitializedState => {
  switch (state.type) {
    case WAIT_FOR_LOGIN:
      return waitForLoginReducer(state, action);
    case WAIT_FOR_ADJUDICATOR:
      return waitForAdjudicatorReducer(state, action);
    case METAMASK_ERROR:
      // We stay in the metamask error state until a change to
      // metamask settings forces a refresh
      return state;
    default:
      return unreachable(state);
  }
};

const waitForLoginReducer = (state: WaitForLogin, action: WalletAction): InitializingState => {
  switch (action.type) {
    case LOGGED_IN:
      return waitForAdjudicator({
        ...state,
        uid: action.uid,
      });
    default:
      return state;
  }
};

const waitForAdjudicatorReducer = (
  state: WaitForAdjudicator,
  action: any,
): InitializingState | InitializedState => {
  switch (action.type) {
    case ADJUDICATOR_KNOWN:
      const { adjudicator, networkId } = action;
      return waitingForChannelInitialization({
        ...state,
        outboxState: { messageOutbox: initializationSuccess() },
        adjudicator,
        networkId,
      });
    default:
      return state;
  }
};
