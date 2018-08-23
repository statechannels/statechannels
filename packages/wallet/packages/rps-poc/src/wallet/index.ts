import {
  WalletFundingAction as WalletFunding,
  WalletFundingActionType,
  WalletFundingRequestAction,
  WalletFundedAction,
} from './redux/actions/wallet-funding';
import {
  WalletAction as Wallet,
  WalletActionType,
  WalletRetrievedAction,
  WalletRequestedAction,
} from './redux/actions/wallet';
import WalletController from './containers/WalletContainer';

export interface Wallet {
  privateKey: string;
  address: string;
  sign(stateString: string): string;
}
export type WalletAction = Wallet;
export const WalletAction = Wallet;
export type WalletFundingAction = WalletFunding;
export const WalletFundingAction = WalletFunding;

export { WalletFundingActionType };
export { WalletActionType };

export { WalletRetrievedAction };
export { WalletRequestedAction };

export { WalletFundingRequestAction };
export { WalletFundedAction };

export { WalletController};