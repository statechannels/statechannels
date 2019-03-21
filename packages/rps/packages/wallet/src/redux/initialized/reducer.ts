import {
  initializingChannel,
  InitializedState,
  WALLET_INITIALIZED,
  INITIALIZING_CHANNEL,
  WAITING_FOR_CHANNEL_INITIALIZATION,
  channelInitialized,
} from './state';

import { waitForFundingRequest } from '../fundingState/state';

import { WalletAction, CHANNEL_INITIALIZED } from '../actions';
import { channelInitializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { ethers } from 'ethers';
import { channelReducer } from '../channelState/reducer';
import { unreachable, combineReducersWithSideEffects } from '../../utils/reducer-utils';
import { fundingStateReducer } from '../fundingState/reducer';

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
          fundingState: waitForFundingRequest(),
        });
      }
      break;
    case INITIALIZING_CHANNEL: // TODO: We could probably get rid of this stage
    case CHANNEL_INITIALIZED: {
      return channelInitialized(channelInitializedReducer(state, action));
    }
    default:
      return unreachable(state);
  }

  return state;
};

const channelInitializedReducer = combineReducersWithSideEffects({
  channelState: channelReducer,
  fundingState: fundingStateReducer,
});
