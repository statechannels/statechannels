import * as blockchainActions from '../actions/blockchain';
import { put, take } from 'redux-saga/effects';
import { WaitForFunding as WaitForFundingA } from '../../../game-engine/application-states/PlayerA';
import { WaitForFunding as WaitForFundingB } from '../../../game-engine/application-states/PlayerB';

import * as stateActions from '../actions/state';
import * as externalActions from '../actions/external';
import WalletEngineA from '../../wallet-engine/WalletEngineA';
import WalletEngineB from '../../wallet-engine/WalletEngineB';
import BN from 'bn.js';
import * as playerActions from '../actions/player';

export function* deployContract(channelId: string, walletEngine: WalletEngineA, amount: BN) {
  let newState = walletEngine.state;
  yield put(blockchainActions.deploymentRequest(channelId, amount));
  newState = walletEngine.transactionSent();

  yield put(stateActions.stateChanged(newState));

  while (true) {
    const deployAction = yield take([
      blockchainActions.DEPLOY_SUCCESS,
      blockchainActions.DEPLOY_FAILURE,
    ]);
    if (deployAction.type === blockchainActions.DEPLOY_FAILURE) {
      newState = walletEngine.errorOccurred(deployAction.error);
      yield put(stateActions.stateChanged(newState));
      yield take(playerActions.TRY_FUNDING_AGAIN);
      yield put(blockchainActions.deploymentRequest(channelId, amount));
    } else {
      newState = walletEngine.transactionConfirmed(deployAction.adjudicator);
      yield put(stateActions.stateChanged(newState));
      return deployAction.address;
    }
  }
}

export function* fundContract(adjudicator: string, walletEngine: WalletEngineB, amount: BN) {
  let newState = walletEngine.deployConfirmed(adjudicator);
  yield put(stateActions.stateChanged(newState));
  yield put(blockchainActions.depositRequest(adjudicator, amount));
  while (true) {
    const fundAction = yield take([
      blockchainActions.DEPOSIT_FAILURE,
      blockchainActions.DEPOSIT_SUCCESS,
    ]);
    if (fundAction.type === blockchainActions.DEPOSIT_FAILURE) {
      newState = walletEngine.errorOccurred(fundAction.error);
      yield put(stateActions.stateChanged(newState));
      yield take(playerActions.TRY_FUNDING_AGAIN);
      yield put(blockchainActions.depositRequest(adjudicator, amount));
    } else {
      newState= walletEngine.transactionConfirmed();
      yield put(stateActions.stateChanged(newState));
      return;
    }
  }
}

export function* fundingSaga(channelId: string, state: WaitForFundingA | WaitForFundingB) {
  const opponentAddress = state.opponentAddress;

  if (state.playerIndex === 0) {
    const walletEngine = WalletEngineA.setupWalletEngine();
    // TODO: We should get the approval from the user from the UI
    let newState = walletEngine.approve();

    const address = yield deployContract(channelId, walletEngine, state.balances[0]);

    yield put(externalActions.sendMessage(opponentAddress, address));

    walletEngine.transactionConfirmed(address);

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
    const newState = walletEngine.approve();

    yield put(stateActions.stateChanged(newState));

    const action: externalActions.ReceiveMessage = yield take(externalActions.RECEIVE_MESSAGE);
    yield fundContract(action.data,walletEngine, state.balances[1]);
  }

  return true;
}
