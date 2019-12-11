export const WALLET_ERROR = 'WALLET.ERROR';
export const WALLET_SUCCESS = 'WALLET.SUCCESS';
export const enum WalletErrorType {
  NoChannelProvider = 'NoChannelProvider',
  EnablingError = 'EnablingError',
  UnknownError = 'UnknownError',
}

export interface WalletError {
  errorType: WalletErrorType;
  networkName?: string;
}

export const walletErrorOccurred = (error: WalletError) => ({
  type: WALLET_ERROR as typeof WALLET_ERROR,
  error,
});

export const walletSuccess = () => ({
  type: WALLET_SUCCESS as typeof WALLET_SUCCESS,
});

export type WalletErrorOccurred = ReturnType<typeof walletErrorOccurred>;
export type WalletSuccess = ReturnType<typeof walletSuccess>;

export type WalletResponse = WalletErrorOccurred | WalletSuccess;
