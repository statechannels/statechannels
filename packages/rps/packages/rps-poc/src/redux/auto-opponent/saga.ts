import { put, take, actionChannel } from 'redux-saga/effects';
import { delay } from 'redux-saga';

import * as autoOpponentActions from './actions';

import { fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { PlayerBStateType as StateType } from '../../game-engine/application-states/PlayerB';
import { Play } from '../../game-engine/positions';
import { default as positionFromHex } from '../../game-engine/positions/decode';
import ChannelWallet from '../../wallet/domain/ChannelWallet';
import { AUTO_OPPONENT_PRIVATE_KEY } from '../../constants';

export default function* autoOpponentSaga() {
  const wallet = new ChannelWallet(AUTO_OPPONENT_PRIVATE_KEY); // generate new wallet just for this process
  yield put(autoOpponentActions.initializationSuccess(wallet.address));

  let gameEngine: GameEngine | null = null;

  const channel = yield actionChannel(autoOpponentActions.MESSAGE_FROM_APP);

  while (true) {
    const action: autoOpponentActions.MessageFromApp = yield take(channel);

    yield delay(2000);
    if (gameEngine === null) {
      // Start up the game engine for our autoplayer B
      gameEngine = fromProposal(positionFromHex(action.data));
    } else {
      gameEngine.receivePosition(positionFromHex(action.data));
    }

    let state = gameEngine.state;

    switch (state.type) {
      case StateType.CHOOSE_PLAY:
        // Good ol rock, nothings beats that!
        state = gameEngine.choosePlay(Play.Rock);
        yield put(autoOpponentActions.messageToApp(state.position.toHex()));
        break;
      case StateType.WAIT_FOR_POST_FUND_SETUP:
        yield put(autoOpponentActions.messageToApp(state.position.toHex()));
        break;
      case StateType.VIEW_RESULT:
        yield put(autoOpponentActions.messageToApp(state.position.toHex()));
        gameEngine.playAgain();
        break;
      default:
        yield put(autoOpponentActions.messageToApp(state.position.toHex()));
    }
  }
}
