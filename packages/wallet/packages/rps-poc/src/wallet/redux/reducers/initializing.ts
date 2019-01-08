import {
  WalletState,
  InitializingState,
  waitForChannel,
  WaitForLogin,
  WaitForAddress,
  WAIT_FOR_LOGIN,
  WAIT_FOR_ADDRESS,
  waitForAddress
} from '../../states';

import { WalletAction, KEYS_LOADED, LOGGED_IN } from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { initializationSuccess } from '../../interface/outgoing';


export const initializingReducer = (state: InitializingState, action: WalletAction): WalletState => {
  switch (state.type) {
    case WAIT_FOR_LOGIN:
      return waitForLoginReducer(state, action);
    case WAIT_FOR_ADDRESS:
      return waitForAddressReducer(state, action);
    default:
      return unreachable(state);
  }
};

const waitForLoginReducer = (state: WaitForLogin, action: any) => {
  switch (action.type) {
    case LOGGED_IN:
      const { uid } = action.uid;
      return waitForAddress({ ...state, uid });
    default:
      return state;
  }
};

const waitForAddressReducer = (state: WaitForAddress, action: any) => {
  switch (action.type) {
    case KEYS_LOADED:
      const { address, privateKey, networkId } = action;
      return waitForChannel({
        ...state, address, privateKey, networkId,
        messageOutbox: initializationSuccess(address),
      });
    default:
      return state;
  }
};
