import { PlayerAState } from '../../wallet-engine/wallet-states/PlayerA';
import { PlayerBState } from '../../wallet-engine/wallet-states/PlayerB';

export const STATE_CHANGED = 'WALLETSTATE.STATECHANGED';

export const stateChanged = (state: PlayerAState | PlayerBState | null) => ({
  type: STATE_CHANGED as typeof STATE_CHANGED,
  state,
});

export type StateChanged = ReturnType<typeof stateChanged>;
