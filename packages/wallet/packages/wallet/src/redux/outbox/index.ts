import { SideEffects, OutboxState } from './state';
/**
 *
 * @param state current global state
 * @param sideEffects: OutboxState -- side effects that the channel reducer declared should happen
 *
 * For each key k in sideEffects, replace state[k] with sideEffects[k]
 */
export function accumulateSideEffects<T = SideEffects | OutboxState>(
  state: T,
  sideEffects: SideEffects | undefined,
): T {
  if (!sideEffects) {
    return state;
  }
  // Defensively copy object as to not modify existing state
  const newState = { ...state };
  // TODO: We need to think about whether we really want to overwrite
  // existing outbox items
  Object.keys(sideEffects).map(k => {
    newState[k] = arrayify(newState[k] || []).concat(arrayify(sideEffects[k]));
  });
  return newState;
}

function arrayify<T>(x: T | T[]): T[] {
  if (Array.isArray(x)) {
    return x;
  } else {
    return [x];
  }
}
