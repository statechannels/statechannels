import {
  // put,
  // take,
  takeEvery,
  // select,
  // fork,
  // call,
} from 'redux-saga/effects';
import { GameActionType } from '../actions/game';

export function * gameControllerSaga(channelId: string) {
  // const initialPledge = yield walletRecieve(message)
  // const gameEngine = GameEngine.fromPledge(initialPledge)

  // subscribe to messageRouted(channelId)
  // subscribe to actions? for our game

  while (true) {
    yield takeEvery(GameActionType.MESSAGE_RECEIVED, updateStateFromMessage);
    yield takeEvery(gameActionArrived, updateStateFromAction);
    
    // yield take('adjudicator found!', notifyWallet);

    // blockchain events
  }
}

function * updateStateFromMessage(newMessage) {
  // when messages arrive
    // let newPosition = walletReceive(newMessage)
    // let newState = gameEngine.messageReceied(newPosition)
    // emit setGameState(channelId, newState)
};

function * updateStateFromAction(gameAction) {
    // when new actions arrive
      // call the appropriate message on the game engine
      // emit setGameState(channelId, newState)
}

function * notifyWallet() {
  // once we know the adjudicator ...
  // tell the wallet that the channel is funded by that adjudicator
  // the wallet subscibes to events there
}

function gameActionArrived(action) {
  return action === GameActionType.CHOOSE_OPPONENT || action === GameActionType.CHOOSE_A_PLAY;
}
