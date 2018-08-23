import { Wallet } from '../..';

export type WalletFundingAction = WalletFundedAction | WalletFundingRequestAction;
export type WalletFundingRequestAction = ReturnType<
  typeof WalletFundingAction.walletFundingRequest
>;

export type WalletFundedAction = ReturnType<typeof WalletFundingAction.walletFunded>;

export enum WalletFundingActionType {
  WALLETFUNDING_REQUEST = 'WALLETFUNDING.REQUEST',
  WALLETFUNDING_FUNDED = 'WALLETFUNDING_FUNDED',
}

export const WalletFundingAction = {
  walletFundingRequest: (wallet: Wallet, playerIndex: number) => ({
    type: WalletFundingActionType.WALLETFUNDING_REQUEST as typeof WalletFundingActionType.WALLETFUNDING_REQUEST,
    wallet,
    playerIndex,
  }),
  walletFunded: (adjudicator: string) => ({
    type: WalletFundingActionType.WALLETFUNDING_FUNDED as typeof WalletFundingActionType.WALLETFUNDING_FUNDED,
    adjudicator,
  }),
};
