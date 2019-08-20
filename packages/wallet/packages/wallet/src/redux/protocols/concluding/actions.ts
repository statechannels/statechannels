import { ActionConstructor } from '../../utils';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import { DefundingAction, isDefundingAction } from '../defunding/actions';
import { WalletAction } from '../../actions';

// -------
// Actions
// -------
export interface CloseSelected {
  type: 'WALLET.CONCLUDING.CLOSE_SELECTED';
  processId: string;
}

export interface KeepOpenSelected {
  type: 'WALLET.CONCLUDING.KEEP_OPEN_SELECTED';
  processId: string;
}

// -------
// Constructors
// -------
export const keepOpenSelected: ActionConstructor<KeepOpenSelected> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.KEEP_OPEN_SELECTED',
});
export const closeSelected: ActionConstructor<CloseSelected> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.CLOSE_SELECTED',
});

// -------
// Unions and Guards
// -------

export type ConcludingAction =
  | KeepOpenSelected
  | CloseSelected
  | AdvanceChannelAction
  | DefundingAction;

export const isConcludingAction = (action: WalletAction): action is ConcludingAction => {
  return (
    action.type === 'WALLET.CONCLUDING.CLOSE_SELECTED' ||
    action.type === 'WALLET.CONCLUDING.KEEP_OPEN_SELECTED' ||
    isAdvanceChannelAction(action) ||
    isDefundingAction(action)
  );
};
