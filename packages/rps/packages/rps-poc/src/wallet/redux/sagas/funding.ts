import * as blockchainActions from '../actions/blockchain';
import { put, take } from 'redux-saga/effects';
import { WaitForFunding as WaitForFundingA } from '../../../game-engine/application-states/PlayerA';
import { WaitForFunding as WaitForFundingB } from '../../../game-engine/application-states/PlayerB';

import * as stateActions from '../actions/state';
import * as externalActions from '../actions/external';
import WalletEngineA from '../../wallet-engine/WalletEngineA';
import WalletEngineB from '../../wallet-engine/WalletEngineB';

export function* fundingSaga(channelId: string, state: WaitForFundingA | WaitForFundingB) {
  const opponentAddress = state.opponentAddress;

  if (state.playerIndex === 0) {
    const walletEngine = WalletEngineA.setupWalletEngine();
    // TODO: We should get the approval from the user from the UI
    let newState = walletEngine.approve();

    yield put(blockchainActions.deploymentRequest(channelId, state.balances[0]));
    newState = walletEngine.transactionSent();

    yield put(stateActions.stateChanged(newState));

    const deploySuceededAction = yield take(blockchainActions.DEPLOY_SUCCESS);
    yield put(externalActions.sendMessage(opponentAddress, deploySuceededAction.address));

    walletEngine.transactionConfirmed(deploySuceededAction.address);

    let action = yield take(blockchainActions.FUNDSRECEIVED_EVENT);
    while (true) {
      if (action.adjudicatorBalance.eq(state.balances[0].add(state.balances[1]))) {
        newState = walletEngine.receiveFundingEvent();
        yield put(blockchainActions.unsubscribeForEvents());
        yield put(stateActions.stateChanged(newState));
        return true;
      }
      action = yield take(blockchainActions.FUNDSRECEIVED_EVENT);
    }
  } else if (state.player === 1) {

    const walletEngine = WalletEngineB.setupWalletEngine();
      // TODO: We should get the approval from the user from the UI
    let newState = walletEngine.approve();

    yield put(stateActions.stateChanged(newState));

    const action: externalActions.ReceiveMessage = yield take(externalActions.RECEIVE_MESSAGE);
    newState = walletEngine.deployConfirmed(action.data);
    yield put(stateActions.stateChanged(newState));
    yield put(blockchainActions.depositRequest(newState.adjudicator, state.balances[1]));
    yield take(blockchainActions.DEPOSIT_SUCCESS);
    walletEngine.transactionConfirmed();
    yield put(stateActions.stateChanged(newState));
  }

  return true;
}
