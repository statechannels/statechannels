export type DeploymentRequest = ReturnType<typeof deploymentRequest>;
export type DeploymentSuccess = ReturnType<typeof deploymentSuccess>;
export type DeploymentFailure = ReturnType<typeof deploymentFailure>;
export type DeploymentResponse = DeploymentSuccess | DeploymentFailure;

export type DepositRequest = ReturnType<typeof depositRequest>;
export type DepositSuccess = ReturnType<typeof depositSuccess>;
export type DepositFailure = ReturnType<typeof depositFailure>;
export type DepositResponse = DepositSuccess | DepositFailure;

export type WrongNetwork = ReturnType<typeof wrongNetwork>;

export const DEPLOY_REQUEST = 'BLOCKCHAIN.DEPLOY.REQUEST';
export const DEPLOY_SUCCESS = 'BLOCKCHAIN.DEPLOY.SUCCESS';
export const DEPLOY_FAILURE = 'BLOCKCHAIN.DEPLOY.FAILURE';

export const DEPOSIT_REQUEST = 'BLOCKCHAIN.DEPOSIT.REQUEST';
export const DEPOSIT_SUCCESS = 'BLOCKCHAIN.DEPOSIT.SUCCESS';
export const DEPOSIT_FAILURE = 'BLOCKCHAIN.DEPOSIT.FAILURE';

export const WRONG_NETWORK = 'BLOCKCHAIN.WRONGNETWORK'

// TODO: Remove this
export const BLOCKCHAIN_RECEIVEEVENT = 'BLOCKCHAIN.RECEIVEEVENT';


export const deploymentRequest = (channelId: any) => ({
  type: DEPLOY_REQUEST,
  channelId,
});
export const deploymentSuccess = (address: string) => ({
  type: DEPLOY_SUCCESS,
  address,
});

export const deploymentFailure = (error: any) => ({
  type: DEPLOY_FAILURE,
  error,
});


export const depositRequest = (address: string, amount: number) => ({
  type: DEPOSIT_REQUEST,
  address,
  amount,
});
export const depositSuccess = (transaction: any) => ({
  type: DEPOSIT_SUCCESS,
  transaction,
});
export const depositFailure = (error: any) => ({
  type: DEPOSIT_FAILURE,
  error,
});



export const wrongNetwork = (networkId: number) => ({
  type: WRONG_NETWORK,
  networkId,
});

// TODO: Remove this
export const receiveEvent = (event: any) => ({
  type: BLOCKCHAIN_RECEIVEEVENT,
  event,
});
