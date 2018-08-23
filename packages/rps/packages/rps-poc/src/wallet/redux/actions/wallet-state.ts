import { State } from '../../wallet-engine/wallet-states';

export enum WalletStateActionType {
  STATE_CHANGED = 'WALLETSTATE.STATECHANGED',
}

export const WalletStateActions = {
  stateChanged: (state: State | null) => ({
    type: WalletStateActionType.STATE_CHANGED as typeof WalletStateActionType.STATE_CHANGED,
    state,
  }),
};
export type WalletStateChangedAction = ReturnType<typeof WalletStateActions.stateChanged>;
