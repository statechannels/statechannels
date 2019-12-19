export const METAMASK_ERROR = 'METAMASK.ERROR';
export const METAMASK_SUCCESS = 'METAMASK.SUCCESS';
export const METAMASK_ENABLE = 'METAMASK.ENABLE';
export const enum MetamaskErrorType {
  WrongNetwork = 'WrongNetwork',
  NoMetaMask = 'NoMetaMask',
  MetamaskLocked = 'MetamaskLocked',
  UnknownError = 'UnknownError',
}

export interface MetamaskError {
  errorType: MetamaskErrorType;
  networkName?: string;
}

export const metamaskErrorOccurred = (error: MetamaskError) => ({
  type: METAMASK_ERROR as typeof METAMASK_ERROR,
  error,
});

export const metamaskSuccess = () => ({
  type: METAMASK_SUCCESS as typeof METAMASK_SUCCESS,
});

export const metamaskEnable = () => ({
  type: METAMASK_ENABLE as typeof METAMASK_ENABLE,
});

export type MetamaskErrorOccurred = ReturnType<typeof metamaskErrorOccurred>;
export type MetamaskSuccess = ReturnType<typeof metamaskSuccess>;
export type MetamaskEnable = ReturnType<typeof metamaskEnable>;

export type MetamaskResponse = MetamaskErrorOccurred | MetamaskSuccess | MetamaskEnable;
