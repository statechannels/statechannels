import { InitializedState } from './state';

import { WalletAction } from '../actions';
import { combineReducersWithSideEffects } from '../../utils/reducer-utils';
import { channelStateReducer } from '../channelState/reducer';
import { fundingStateReducer } from '../fundingState/reducer';
import { accumulateSideEffects } from '../outbox';

export function initializedReducer(
  state: InitializedState,
  action: WalletAction,
): InitializedState {
  const { state: newState, sideEffects } = combinedReducer(state, action);
  // Since the wallet state itself has an outbox state, we need to apply the side effects
  // by hand.
  return {
    ...state,
    ...newState,
    outboxState: accumulateSideEffects(state.outboxState, sideEffects),
  };
}
const combinedReducer = combineReducersWithSideEffects({
  channelState: channelStateReducer,
  fundingState: fundingStateReducer,
});
