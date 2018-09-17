export const METAMASK_ERROR = 'METAMASK.ERROR';
export const METAMASK_SUCCESS = 'METAMASK.SUCCESS';
export const enum MetamaskErrorType {WrongNetwork="WrongNetwork", NoWeb3="NoWeb3"}

export interface MetamaskError {
  errorType: MetamaskErrorType;
  networkId?: number;
}

export const metamaskErrorOccurred = (error: MetamaskError) => ({
  type: METAMASK_ERROR as typeof METAMASK_ERROR,
  error,
});

export const metamaskSuccess = () => ({
  type: METAMASK_SUCCESS as typeof METAMASK_SUCCESS,
});

export type MetamaskErrorOccurred = ReturnType<typeof metamaskErrorOccurred>;
export type MetamaskSuccess = ReturnType<typeof metamaskSuccess>;

export type MetamaskResponse = MetamaskErrorOccurred | MetamaskSuccess;
