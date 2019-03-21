import { OutboxState } from './state';
/**
 *
 * @param state current global state
 * @param sideEffects: OutboxState -- side effects that the channel reducer declared should happen
 *
 * For each key k in sideEffects, replace state[k] with sideEffects[k]
 */
export function applySideEffects(
  state: OutboxState,
  sideEffects: OutboxState | undefined,
): OutboxState {
  if (!sideEffects) {
    return state;
  }
  // Defensively copy object as to not modify existing state
  const newState = { ...state };
  // TODO: We need to think about whether we really want to overwrite
  // existing outbox items
  Object.keys(sideEffects).map(k => (newState[k] = sideEffects[k]));
  return newState;
}
