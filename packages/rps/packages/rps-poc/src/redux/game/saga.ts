import { take, put, actionChannel } from 'redux-saga/effects';

import { GameEngine } from '../../game-engine/GameEngine';

import { actions as walletActions } from '../../wallet';
import * as messageActions from '../message-service/actions';
import * as gameActions from '../game/actions';
import * as applicationActions from '../application/actions';

import { default as positionFromHex } from '../../game-engine/positions/decode';

import { PlayerAStateType } from '../../game-engine/application-states/PlayerA';
import { PlayerBStateType } from '../../game-engine/application-states/PlayerB';

export default function* gameSaga(gameEngine: GameEngine) {
  yield put(applicationActions.gameSuccess(gameEngine.state));
  yield processState(gameEngine.state);

  const channel = yield actionChannel([
    messageActions.MESSAGE_RECEIVED,
    gameActions.CHOOSE_PLAY,
    walletActions.FUNDING_SUCCESS,
    walletActions.FUNDING_FAILURE,
  ]);

  while (true) {
    const action = yield take(channel);
    const oldState = gameEngine.state;
    let newState = oldState;

    switch (action.type) {
      case messageActions.MESSAGE_RECEIVED:
        newState = gameEngine.receivePosition(positionFromHex(action.message));
        break;
      case gameActions.CHOOSE_PLAY:
        newState = gameEngine.choosePlay(action.play);
        break;
      case walletActions.FUNDING_SUCCESS:
        // TODO: We'll need the gameEngine to handle what happens if the funding fails for some reason
        newState = gameEngine.fundingConfirmed();
        // We've received funding so we need to update the game state again
        break;
      default:
      // do nothing
    }

    if (newState && newState !== oldState) {
      yield processState(newState);
    }
  }
}

function* sendState(state) {
  yield put(messageActions.sendMessage(state.opponentAddress, state.position.toHex()));
}

function* processState(state) {
  switch (state.type) {
    case PlayerAStateType.WAIT_FOR_FUNDING:
    case PlayerBStateType.WAIT_FOR_FUNDING:
      yield put(walletActions.fundingRequest(state.channelId, state));
      yield sendState(state);
      break;
    case PlayerAStateType.CHOOSE_PLAY:
    case PlayerBStateType.CHOOSE_PLAY:
      break; // don't send anything if the next step is to ChoosePlay
    default:
      yield sendState(state);
  }
  yield put(gameActions.stateChanged(state));
}
