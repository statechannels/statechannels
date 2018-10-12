import { take, put, actionChannel, } from 'redux-saga/effects';

import { GameEngine } from '../../game-engine/GameEngine';

import { actions as walletActions } from '../../wallet';
import * as messageActions from '../message-service/actions';
import * as gameActions from '../game/actions';
import * as applicationActions from '../application/actions';

import { default as positionFromHex } from '../../game-engine/positions/decode';

import { PlayerAStateType } from '../../game-engine/application-states/PlayerA';
import { PlayerBStateType } from '../../game-engine/application-states/PlayerB';


export default function* gameSaga(gameEngine: GameEngine) {
  yield put(walletActions.openChannelRequest(gameEngine.state.channel));
  yield take(walletActions.CHANNEL_OPENED);
  yield put(applicationActions.gameSuccess(gameEngine.state));
  yield processState(gameEngine.state);

  const channel = yield actionChannel([
    messageActions.MESSAGE_RECEIVED,
    gameActions.CHOOSE_PLAY,
    gameActions.PLAY_AGAIN,
    gameActions.ABANDON_GAME,
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
      case gameActions.PLAY_AGAIN:
        newState = gameEngine.playAgain();
        break;
      case gameActions.ABANDON_GAME:
        newState = gameEngine.conclude();
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

    if (newState.type === PlayerBStateType.CONCLUDE_RECEIVED || newState.type === PlayerAStateType.CONCLUDE_RECEIVED) {
      newState = gameEngine.conclude();
      yield take(messageActions.MESSAGE_SENT);
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
      const { myAddress, opponentAddress, myBalance, opponentBalance } = state;
      const playerIndex = (state.type === PlayerAStateType.WAIT_FOR_FUNDING) ? 0 : 1;
      yield put(walletActions.fundingRequest(
        state.channelId,
        myAddress,
        opponentAddress,
        myBalance,
        opponentBalance,
        playerIndex,
 ));
      yield sendState(state);
      break;
    case PlayerAStateType.CHOOSE_PLAY:
    case PlayerBStateType.CHOOSE_PLAY:
      break; // don't send anything if the next step is to ChoosePlay
    case PlayerAStateType.CONCLUDED:
    case PlayerBStateType.CONCLUDED:
      yield put(walletActions.withdrawalRequest(state));
      yield take(walletActions.WITHDRAWAL_SUCCESS);
      yield put(walletActions.closeChannelRequest());
      yield put(applicationActions.lobbyRequest());
      // Once the game is concluded, the players do not need to interact with each other
      break;
    default:
      yield sendState(state);
  }
  yield put(gameActions.stateChanged(state));
}
