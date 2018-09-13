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
import { PlayerBState, ReadyToDeposit } from '../../wallet-engine/wallet-states/PlayerB';

interface EngineArguments {
  opponentAddress: string;
  myAddress: string;
  myBalance: BN;
  opponentBalance: BN;
}

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

export function* fundContract(walletEngine: WalletEngineB, amount: BN) {
  let newState = walletEngine.state;
  const { adjudicatorAddress } = newState.position;
  yield put(stateActions.stateChanged(newState));
  yield put(blockchainActions.depositRequest(adjudicatorAddress, amount));
  while (true) {
    const fundAction = yield take([
      blockchainActions.DEPOSIT_FAILURE,
      blockchainActions.DEPOSIT_SUCCESS,
    ]);
    if (fundAction.type === blockchainActions.DEPOSIT_FAILURE) {
      newState = walletEngine.errorOccurred(fundAction.error);
      yield put(stateActions.stateChanged(newState));
      yield take(playerActions.TRY_FUNDING_AGAIN);
      yield put(blockchainActions.depositRequest(adjudicatorAddress, amount));
    } else {
      newState = walletEngine.transactionConfirmed();
      yield put(stateActions.stateChanged(newState));
      return;
    }
  }
}

export function* playerAFundingSaga(channelId, engineArguments: EngineArguments) {
  const walletEngine = WalletEngineA.setupWalletEngine(engineArguments);
  yield put(stateActions.stateChanged(walletEngine.state));
  const approvalAction = yield take([playerActions.APPROVE_FUNDING, playerActions.DECLINE_FUNDING]);
  if (approvalAction.type === playerActions.DECLINE_FUNDING) {
    return false;
  }
  let newState = walletEngine.approve();

  const address = yield deployContract(channelId, walletEngine, engineArguments.myBalance);

  yield put(externalActions.sendMessage(engineArguments.opponentAddress, address));

  walletEngine.transactionConfirmed(address);

  let action = yield take(blockchainActions.FUNDSRECEIVED_EVENT);
  while (true) {
    if (
      action.adjudicatorBalance.eq(engineArguments.myBalance.add(engineArguments.opponentBalance))
    ) {
      newState = walletEngine.receiveFundingEvent();
      yield put(blockchainActions.unsubscribeForEvents());
      yield put(stateActions.stateChanged(newState));
      return true;
    }
    action = yield take(blockchainActions.FUNDSRECEIVED_EVENT);
  }
}

function* playerBFundingSaga(channelId: string, engineArguments: EngineArguments) {
  const walletEngine = WalletEngineB.setupWalletEngine(engineArguments);
  let newState: PlayerBState = walletEngine.state;
  yield put(stateActions.stateChanged(walletEngine.state));

  while (newState.constructor !== ReadyToDeposit) {
    const action = yield take([
      playerActions.APPROVE_FUNDING,
      playerActions.DECLINE_FUNDING,
      externalActions.RECEIVE_MESSAGE,
    ]);
    if (action.type === playerActions.DECLINE_FUNDING) {
      return false;
    }
    if (action.type === playerActions.APPROVE_FUNDING) {
      newState = walletEngine.approve();
    }
    if (action.type === externalActions.RECEIVE_MESSAGE) {
      newState = walletEngine.deployConfirmed(action.data);
    }
    yield put(stateActions.stateChanged(newState));
  }

  yield fundContract(walletEngine, engineArguments.myBalance);
}

export function* fundingSaga(channelId: string, state: WaitForFundingA | WaitForFundingB) {
  const engineArguments = {
    opponentAddress: state.opponentAddress,
    myAddress: state.myAddress,
    myBalance: state.myBalance,
    opponentBalance: state.opponentBalance,
  };

  if (state.playerIndex === 0) {
    yield playerAFundingSaga(channelId, engineArguments);
  } else if (state.playerIndex === 1) {
    yield playerBFundingSaga(channelId, engineArguments);
  }

  return true;
}
