import { State } from '../../wallet-engine/wallet-states';

export const STATE_CHANGED = 'WALLETSTATE.STATECHANGED';

export const stateChanged = (state: State | null) => ({
  type: STATE_CHANGED as typeof STATE_CHANGED,
  state,
});

export type StateChanged = ReturnType<typeof stateChanged>;
