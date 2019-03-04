import {
  WalletState,
  InitializingState,
  waitForChannel,
  WaitForLogin,
  WaitForAddress,
  WAIT_FOR_LOGIN,
  WAIT_FOR_ADDRESS,
  waitForAddress,
  metaMaskError,
  METAMASK_ERROR
} from '../../states';

import { WalletAction, KEYS_LOADED, LOGGED_IN, METAMASK_LOAD_ERROR } from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { initializationSuccess, showWallet } from 'magmo-wallet-client/lib/wallet-events';


export const initializingReducer = (state: InitializingState, action: WalletAction): WalletState => {
  switch (state.type) {
    case WAIT_FOR_LOGIN:
      return waitForLoginReducer(state, action);
    case WAIT_FOR_ADDRESS:
      return waitForAddressReducer(state, action);
    case METAMASK_ERROR:
      // We stay in the metamask error state until a change to 
      // metamask settings forces a refresh 
      return state;
    default:
      return unreachable(state);
  }
};

const waitForLoginReducer = (state: WaitForLogin, action: any) => {
  switch (action.type) {
    case LOGGED_IN:
      const { uid } = action;
      return waitForAddress({ ...state, uid });
    default:
      return state;
  }
};

const waitForAddressReducer = (state: WaitForAddress, action: any) => {
  switch (action.type) {
    case METAMASK_LOAD_ERROR:
      return metaMaskError({ ...state, displayOutbox: showWallet() });
    case KEYS_LOADED:
      const { address, privateKey, networkId, adjudicator } = action;
      return waitForChannel({
        ...state, address, privateKey, networkId, adjudicator,
        messageOutbox: initializationSuccess(address),
      });
    default:
      return state;
  }
};
