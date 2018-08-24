import { takeEvery, put, take, actionChannel, select } from 'redux-saga/effects';
import { delay } from 'redux-saga';
import { GameActionType, GameAction } from '../actions/game';
import { MessageActionType, MessageAction, SendMessageAction } from '../actions/messages';
import { fromProposal, GameEngine } from '../../game-engine/GameEngine';
import Move from '../../game-engine/Move';
import { ReadyToChooseBPlay, WaitForFunding } from '../../game-engine/application-states/PlayerB';
import { Play } from '../../game-engine/positions';
import { getUser } from '../store';
import { WalletActionType, WalletFundingAction, WalletRetrievedAction } from '../../wallet';

export default function* autoOpponentSaga() {
  yield takeEvery(GameActionType.PLAY_COMPUTER, startAutoOpponent);
}

function* startAutoOpponent() {
  const user = yield select(getUser);

  yield put({ type: WalletActionType.WALLET_REQUESTED, uid: user.uid });
  const walletAction: WalletRetrievedAction = yield take(WalletActionType.WALLET_RETRIEVED);
  const { wallet } = walletAction;
  yield put(GameAction.chooseOpponent(wallet.address, 50));

  let gameEngine: GameEngine | null = null;

  const actionFilter = (action): boolean => {
    return action.type === MessageActionType.SEND_MESSAGE && action.to === wallet.address;
  };

  // Get a channel of actions we're interested in
  const channel = yield actionChannel(actionFilter);

  while (true) {
    const action: SendMessageAction = yield take(channel);

    yield delay(2000);
    if (gameEngine === null) {
      // Start up the game engine for our autoplayer B
      gameEngine = fromProposal({ move: Move.fromHex(action.data), wallet });
      yield continueWithFollowingActions(gameEngine);
    } else {
      gameEngine.receiveMove(Move.fromHex(action.data));

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
    } else if (state instanceof WaitForFunding) {
      // If we're waiting for funding we broadcast to everyone that funding is done
      // TODO: This will be a bit strange with the blockchain faker competing against it
      yield put (WalletFundingAction.walletFunded('0xComputerPlayerFakeAddress'));
      gameEngine.fundingRequested();
      gameEngine.fundingConfirmed({ adjudicator: '0xComputerPlayerFakeAddress' });
    } else {
      return false;
    }
  }
}
