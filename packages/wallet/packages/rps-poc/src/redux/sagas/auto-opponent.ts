import {
  takeEvery,
  put,
  take,
  actionChannel,
  select,
} from 'redux-saga/effects';
import { GameActionType, GameAction, MoveSentAction } from '../actions/game';
import { fetchOrCreateWallet } from './wallet';
import { MessageActionType, MessageAction } from '../actions/messages';
import { fromProposal, GameEngine } from '../../game-engine/GameEngine';
import Move from '../../game-engine/Move';
import { WaitForBToDeposit } from '../../game-engine/application-states/PlayerA';
import { ReadyToChooseBPlay } from '../../game-engine/application-states/PlayerB';
import { Play } from '../../game-engine/positions';
import { getUser } from '../store';

export default function* autoOpponentSaga() {
  yield takeEvery(GameActionType.PLAY_COMPUTER, startAutoOpponent);
}

function* startAutoOpponent() {
  const user = yield select(getUser);

  const wallet = yield fetchOrCreateWallet(`AutoPlayer_${user.uid}`);
  yield put(GameAction.chooseOpponent(wallet.address, 50));

  let gameEngine: GameEngine | null = null;

  const actionFilter = (action): boolean => {
    return (
      (action.type === MessageActionType.SEND_MESSAGE &&
        action.to === wallet.address) ||
      (action.type === GameActionType.STATE_CHANGED &&
        action.state instanceof WaitForBToDeposit)
    );
  };

  // Get a channel of actions we're interested in
  const channel = yield actionChannel(actionFilter);

  while (true) {
    const action = yield take(channel);

    if (gameEngine === null) {
      // Start up the game engine for our autoplayer B
      gameEngine = fromProposal({ move: Move.fromHex(action.data), wallet });
      yield put(MessageAction.messageReceived(gameEngine.state.move.toHex()));
    } else {
      switch (action.type) {
        case MessageActionType.SEND_MESSAGE:
          yield handleMessage(gameEngine);
          break;
        // We're filtering our actions so the state will always be WaitForBToDeposit 
        case GameActionType.STATE_CHANGED:
          // Fake sending to the blockchain for now
          gameEngine.receiveEvent({});
          gameEngine.transactionSent();
          break;
      }
    }
  }
}

function* handleMessage(gameEngine: GameEngine) {
  // We want to wait until move sent to prevent handling a move before player A is done processing
  const action: MoveSentAction = yield take(GameActionType.MOVE_SENT);
  let newState = gameEngine.receiveMove(action.move);

  if (newState instanceof ReadyToChooseBPlay) {
    // Good ol rock, nothings beats that!
    newState = gameEngine.choosePlay(Play.Rock);
  }

  if (newState.isReadyToSend) {
    yield put(MessageAction.messageReceived(gameEngine.state.move.toHex()));
    newState = gameEngine.moveSent();
  }
}
