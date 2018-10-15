import { put, take } from 'redux-saga/effects';
import BN from 'bn.js';

import * as blockchainActions from '../actions/blockchain';
import * as stateActions from '../actions/state';
import * as externalActions from '../actions/external';
import * as playerActions from '../actions/player';

import WalletEngine from '../../wallet-engine/WalletEngine';
import * as PlayerA from '../../wallet-engine/wallet-states/PlayerA';
import * as PlayerB from '../../wallet-engine/wallet-states/PlayerB';
import * as CommonState from '../../wallet-engine/wallet-states';
import { InvalidStateError, PlayerIndex } from '../../wallet-engine/wallet-states';

export function* deployContract(channelId: string, walletEngine: WalletEngine, amount: BN) {
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
      newState = walletEngine.deployConfirmed(deployAction.adjudicator);
      yield put(stateActions.stateChanged(newState));
      return deployAction.address;
    }
  }
}

export function* fundContract(walletEngine: WalletEngine, amount: BN) {
  let newState = walletEngine.state;
  if (!(newState instanceof PlayerB.ReadyToDeposit)) {
    throw new InvalidStateError(newState);
  }
  const { adjudicatorAddress } = newState;

  yield put(blockchainActions.depositRequest(adjudicatorAddress, amount));
  newState = walletEngine.transactionSent();
  yield put(stateActions.stateChanged(newState));

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
      newState = walletEngine.fundingConfirmed(adjudicatorAddress);
      yield put(stateActions.stateChanged(newState));
      return;
    }
  }
}



export function* playerAFundingSaga(channelId, walletEngine: WalletEngine) {
  if (!(walletEngine.state instanceof PlayerA.WaitForApproval)) {
    throw new InvalidStateError(walletEngine.state);
  }
  yield put(stateActions.stateChanged(walletEngine.state));
  const { myBalance, opponentBalance } = walletEngine.state;

  const approvalAction = yield take([playerActions.APPROVE_FUNDING, playerActions.DECLINE_FUNDING]);
  if (approvalAction.type === playerActions.DECLINE_FUNDING) {
    return false;
  }
  let newState = walletEngine.approve();

  const address = yield deployContract(channelId, walletEngine, myBalance);

  yield put(externalActions.sendMessage(walletEngine.opponentAddress, address));

  let action = yield take(blockchainActions.FUNDSRECEIVED_EVENT);
  while (true) {
    if (
      action.adjudicatorBalance.eq(myBalance.add(opponentBalance))
    ) {
      newState = walletEngine.receiveFundingEvent();
      yield put(blockchainActions.unsubscribeForEvents());
      yield put(stateActions.stateChanged(newState));
      return true;
    }
    action = yield take(blockchainActions.FUNDSRECEIVED_EVENT);
  }
}

function* playerBFundingSaga(walletEngine: WalletEngine) {
  if (!(walletEngine.state instanceof PlayerB.WaitForApproval)) {
    throw new InvalidStateError(walletEngine.state);
  }
  yield put(stateActions.stateChanged(walletEngine.state));
  const { myBalance } = walletEngine.state;

  let newState: PlayerB.PlayerBState = walletEngine.state;
  while (!(newState instanceof PlayerB.ReadyToDeposit)) {
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

  yield fundContract(walletEngine, myBalance);
}

export function* fundingSaga(channelId: string, walletEngine: WalletEngine) {
  const state = walletEngine.state;
  if (!(state instanceof CommonState.WaitForApproval)) {
    throw new InvalidStateError(state);
  }

  if (walletEngine.playerIndex === PlayerIndex.A) {
    yield playerAFundingSaga(channelId, walletEngine);
  } else if (walletEngine.playerIndex === PlayerIndex.B) {
    yield playerBFundingSaga(walletEngine);
  }

  return true;
}
