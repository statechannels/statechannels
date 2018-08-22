export type WalletAction = ReturnType<typeof WalletAction.walletRetrieved>;

export enum WalletActionType {
  WALLET_RETRIEVED = 'WALLET.RETRIEVED',
  WALLET_REQUESTED = 'WALLET.REQUESTED',
}

export const WalletAction = {
  walletRetrieved: (wallet: Wallet) => ({
    type: WalletActionType.WALLET_RETRIEVED as typeof WalletActionType.WALLET_RETRIEVED,
    wallet,
  }),
  walletRequest: (uid: string) => ({
    type: WalletActionType.WALLET_REQUESTED as typeof WalletActionType.WALLET_REQUESTED,
    uid,
  }),
};

export interface Wallet {
  privateKey: string;
  address: string;
  sign(stateString: string): string;
}
