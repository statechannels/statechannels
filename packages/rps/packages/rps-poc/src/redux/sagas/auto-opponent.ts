import { put, take, actionChannel, select, fork } from 'redux-saga/effects';
import { delay } from 'redux-saga';
import { GameActionType, GameAction, MoveSentAction } from '../actions/game';
import { MessageAction } from '../actions/messages';
import { fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { ReadyToChooseBPlay, ReadyToFund } from '../../game-engine/application-states/PlayerB';
import { Play } from '../../game-engine/positions';
import { getUser } from '../store';
import { WalletActionType, WalletRetrievedAction, WalletFundingActionType } from '../../wallet';

export default function* autoOpponentSaga() {
  while (yield take(GameActionType.PLAY_COMPUTER)) {
     yield fork(startAutoOpponent);
    // TODO: Cancel auto opponent if needed
  }
}

function* startAutoOpponent() {
  const user = yield select(getUser);

  yield put({ type: WalletActionType.WALLET_REQUESTED, uid: user.uid });
  const walletAction: WalletRetrievedAction = yield take(WalletActionType.WALLET_RETRIEVED);
  const { wallet } = walletAction;
  yield put(GameAction.chooseOpponent(wallet.address, 50));

  let gameEngine: GameEngine | null = null;

  // Get a channel of actions we're interested in
  const channel = yield actionChannel(GameActionType.MOVE_SENT);

  while (true) {
    const action: MoveSentAction = yield take(channel);

    yield delay(2000);
    if (gameEngine === null) {
      // Start up the game engine for our autoplayer B
      gameEngine = fromProposal({ move: action.move, wallet });
      yield continueWithFollowingActions(gameEngine);
    } else {
      gameEngine.receiveMove(action.move);

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
    } else if (state instanceof ReadyToFund) {
      // TODO: We're relying on the blockchain faker for now. Once that's no longer the case
      // we'll have to handle some funding logic here
      // yield put (WalletFundingAction.walletFunded('0xComputerPlayerFakeAddress'));
      gameEngine.fundingRequested();
      const action = yield take(WalletFundingActionType.WALLETFUNDING_FUNDED);
      gameEngine.fundingConfirmed({ adjudicator: action.adjudicator });
    } else {
      return false;
    }
  }
}
