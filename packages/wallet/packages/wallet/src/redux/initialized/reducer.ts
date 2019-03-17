import {
  initializingChannel,
  InitializedState,
  WALLET_INITIALIZED,
  INITIALIZING_CHANNEL,
  WAITING_FOR_CHANNEL_INITIALIZATION,
  channelInitialized,
} from './state';

import { WalletAction, CHANNEL_INITIALIZED } from '../actions';
import { channelInitializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { ethers } from 'ethers';
import { channelReducer } from '../channelState/reducer';
import { unreachable } from '../../utils/reducer-utils';
import { outboxStateReducer } from '../reducer';

export const initializedReducer = (
  state: InitializedState,
  action: WalletAction,
): InitializedState => {
  if (state.stage !== WALLET_INITIALIZED) {
    return state;
  }

  switch (state.type) {
    case WAITING_FOR_CHANNEL_INITIALIZATION:
      if (action.type === CHANNEL_INITIALIZED) {
        const wallet = ethers.Wallet.createRandom();
        const { address, privateKey } = wallet;

        return initializingChannel({
          ...state,
          outboxState: { messageOutbox: channelInitializationSuccess(wallet.address) },
          channelState: { address, privateKey },
        });
      }
      break;
    case INITIALIZING_CHANNEL:
    case CHANNEL_INITIALIZED:
      const { channelState, outboxState: sideEffects, unhandledAction } = channelReducer(
        state.channelState,
        action,
        state.unhandledAction,
      );
      state = { ...state, outboxState: outboxStateReducer(state.outboxState, sideEffects) };
      return channelInitialized({
        ...state,
        channelState,
        unhandledAction,
      });
    default:
      return unreachable(state);
  }

  return state;
};
