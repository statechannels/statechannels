import { InitializedState } from './state';

import { WalletAction } from '../actions';
import { combineReducersWithSideEffects } from '../../utils/reducer-utils';
import { channelStateReducer } from '../channelState/reducer';
import { fundingStateReducer } from '../fundingState/reducer';
import { applySideEffects } from '../outbox';

export function initializedReducer(
  state: InitializedState,
  action: WalletAction,
): InitializedState {
  const { state: newState, outboxState: sideEffects } = combinedReducer(state, action);
  // Since the wallet state itself has an outbox state, we need to apply the side effects
  // by hand.
  return { ...state, ...newState, outboxState: applySideEffects(state.outboxState, sideEffects) };
}
const combinedReducer = combineReducersWithSideEffects({
  channelState: channelStateReducer,
  fundingState: fundingStateReducer,
});
