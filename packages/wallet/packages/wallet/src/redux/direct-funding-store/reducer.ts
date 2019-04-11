import * as directFundingStore from './state';
import * as states from '../protocols/direct-funding/state';
import * as actions from '../actions';

import { StateWithSideEffects } from 'src/redux/utils';

export const directFundingStoreReducer = (
  state: directFundingStore.DirectFundingStore,
  action: actions.WalletAction,
): StateWithSideEffects<directFundingStore.DirectFundingStore> => {
  if (action.type !== actions.internal.DIRECT_FUNDING_REQUESTED) {
    // The sole responsibility of this reducer is to start direct funding, when
    // requested.
    return { state };
  }

  const { channelId } = action;
  if (state[channelId]) {
    // The wallet has requested to start the funding for a channel that already has
    // a funding state
    return { state };
  }
  const { state: directFunding, sideEffects } = states.initialDirectFundingState(action);

  return {
    state: {
      ...state,
      [channelId]: directFunding,
    },
    sideEffects,
  };
};
