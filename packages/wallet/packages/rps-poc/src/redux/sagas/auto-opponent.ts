import { takeEvery, put, take, actionChannel, select } from 'redux-saga/effects';
import { delay } from 'redux-saga';
import { GameActionType, GameAction } from '../actions/game';
import { MessageActionType, MessageAction } from '../actions/messages';
import { fromProposal, GameEngine } from '../../game-engine/GameEngine';
import Move from '../../game-engine/Move';
import { ReadyToChooseBPlay, ReadyToDeposit } from '../../game-engine/application-states/PlayerB';
import { Play } from '../../game-engine/positions';
import { getUser } from '../store';
import { WalletActionType, WalletAction } from '../../wallet';

export default function* autoOpponentSaga() {
  yield takeEvery(GameActionType.PLAY_COMPUTER, startAutoOpponent);
}

function* startAutoOpponent() {
  const user = yield select(getUser);

  yield put({ type: WalletActionType.WALLET_REQUESTED, uid: user.uid });
  const walletAction: WalletAction = yield take(WalletActionType.WALLET_RETRIEVED);
  const {wallet} = walletAction;
  yield put(GameAction.chooseOpponent(wallet.address, 50));

  let gameEngine: GameEngine | null = null;

  const actionFilter = (action): boolean => {
    return (
      (action.type === MessageActionType.SEND_MESSAGE && action.to === wallet.address) ||
      action.type === GameActionType.EVENT_RECEIVED
    );
  };

  // Get a channel of actions we're interested in
  const channel = yield actionChannel(actionFilter);

  while (true) {
    const action: GameAction | MessageAction = yield take(channel);

    yield delay(2000);
    if (gameEngine === null) {
      if (action.type !== MessageActionType.SEND_MESSAGE) {
        return false;
      }
      // Start up the game engine for our autoplayer B
      gameEngine = fromProposal({ move: Move.fromHex(action.data), wallet });
      yield continueWithFollowingActions(gameEngine);
    } else {
      switch (action.type) {
        case MessageActionType.SEND_MESSAGE:
          gameEngine.receiveMove(Move.fromHex(action.data));
          break;
        case GameActionType.EVENT_RECEIVED:
          // Fake sending to the blockchain for now
          gameEngine.receiveEvent({});
          break;
      }
      yield continueWithFollowingActions(gameEngine);
    }
  }
}

function* continueWithFollowingActions(gameEngine: GameEngine) {
  while (true) {
    // keep going until we don't have an action to take
    const state = gameEngine.state;

    if (state instanceof ReadyToChooseBPlay) {
      // Good ol rock, nothings beats that!
      gameEngine.choosePlay(Play.Rock);
    } else if (state.isReadyToSend) {
      yield put(MessageAction.messageReceived(gameEngine.state.move.toHex()));
      gameEngine.moveSent();
    } else if (state instanceof ReadyToDeposit) {
      gameEngine.transactionSent();
    } else {
      return false;
    }
  }
}
