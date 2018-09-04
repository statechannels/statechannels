import { put, take, actionChannel, fork } from 'redux-saga/effects';
import { delay } from 'redux-saga';
import { GameActionType, GameAction } from '../actions/game';
import { MessageAction, SendMessageAction, MessageActionType } from '../actions/messages';
import { fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { PlayerBStateType as StateType } from '../../game-engine/application-states/PlayerB';
import { Play } from '../../game-engine/positions';
import { default as positionFromHex } from '../../game-engine/positions/decode';
import ChannelWallet from '../../wallet/domain/ChannelWallet';

export default function* autoOpponentSaga() {
  while (yield take(GameActionType.PLAY_COMPUTER)) {
    yield fork(startAutoOpponent);
    // TODO: Cancel auto opponent if needed
  }
}

function* startAutoOpponent() {
  const wallet = new ChannelWallet(); // generate new wallet just for this process
  yield put(GameAction.chooseOpponent(wallet.address, 50));

  let gameEngine: GameEngine | null = null;

  // Get a channel of actions we're interested in
  const channel = yield actionChannel(MessageActionType.SEND_MESSAGE);

  while (true) {
    const action: SendMessageAction = yield take(channel);

    yield delay(2000);

    if (gameEngine === null) {
      // Start up the game engine for our autoplayer B
      gameEngine = fromProposal(positionFromHex(action.data));
    } else {
      gameEngine.receivePosition(positionFromHex(action.data));
    }

    let state = gameEngine.state;

    switch(state.type) {
        case StateType.CHOOSE_PLAY:
          // Good ol rock, nothings beats that!
          state = gameEngine.choosePlay(Play.Rock);
          yield put(MessageAction.messageReceived(state.position.toHex()));
          break;
        case StateType.WAIT_FOR_FUNDING:
          yield put(MessageAction.messageReceived(state.position.toHex()));
          gameEngine.fundingConfirmed();
          break;
        default:
          yield put(MessageAction.messageReceived(state.position.toHex()));
    }
  }
}
