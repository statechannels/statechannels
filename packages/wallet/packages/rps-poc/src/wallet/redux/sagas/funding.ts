
export function* fundingSaga(channelId: string) {
  
  // todo:
  // - check that we already have both prefundsetup states for that channel
// - determine the player and the amounts from the prefund setup states
  // - update state to display confirmation screen to user
  // - wait for user's response
  // - if player a
  //   - send transaction to blockchain
  // yield put(blockchainActions.deploymentRequest(channelId));
  // const action:blockchainActions.DeploymentSuccess = yield take(blockchainActions.DEPLOY_SUCCESS);
  // yield put (blockchainActions.depositRequest(action.address,1));
  // yield take(blockchainActions.DEPOSIT_SUCCESS);
  //   - update state to display "waiting for deploy"
  //   - wait for confirmation
  //   - send adjudicator address to opponent
  //   - update state to display "waiting for deposit"
  //   - wait for opponent to deposit / blockchain confirmation
  //   - update state to display the success screen
  //   - wait for user to click "return-to-app"
  

  return true;
}
