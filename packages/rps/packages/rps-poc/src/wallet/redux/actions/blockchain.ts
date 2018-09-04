export type DeploymentRequest = ReturnType<typeof deploymentRequest>;
export type DeploymentSuccess = ReturnType<typeof deploymentSuccess>;
export type DeploymentWrongNetworkFailure = ReturnType<typeof deploymentWrongNetworkFailure>;
export type DeploymentMetamaskFailure = ReturnType<typeof deploymentMetamaskFailure>;
export type DeploymentFailure = DeploymentWrongNetworkFailure | DeploymentMetamaskFailure;
export type DeploymentResponse = DeploymentSuccess | DeploymentFailure;

export const BLOCKCHAIN_DEPLOYADJUDICATOR = 'BLOCKCHAIN.DEPLOYADJUDICATOR';
export const BLOCKCHAIN_ADJUDICATORDEPLOYED = 'BLOCKCHAIN.ADJUDICATORDEPLOYED';
export const BLOCKCHAIN_METAMASKERROR = 'BLOCKCHAIN.METAMASKERROR';
export const BLOCKCHAIN_WRONGNETWORK = 'BLOCKCHAIN.WRONGNETWORK';
export const BLOCKCHAIN_RECEIVEEVENT = 'BLOCKCHAIN.RECEIVEEVENT';

export const deploymentRequest = (channelId: any) => ({
  type: BLOCKCHAIN_DEPLOYADJUDICATOR,
  channelId,
});
export const deploymentSuccess = (address: string) => ({
  type: BLOCKCHAIN_ADJUDICATORDEPLOYED,
  address,
});

export const deploymentMetamaskFailure = (error: any) => ({
  type: BLOCKCHAIN_METAMASKERROR,
  error,
});
export const deploymentWrongNetworkFailure = (networkId: number) => ({
  type: BLOCKCHAIN_WRONGNETWORK,
  networkId,
});
export const receiveEvent = (event: any) => ({
  type: BLOCKCHAIN_RECEIVEEVENT,
  event,
});
