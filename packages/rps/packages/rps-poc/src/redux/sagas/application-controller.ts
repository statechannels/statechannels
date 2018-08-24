import { take, put, actionChannel } from 'redux-saga/effects';

import { MessageActionType, MessageAction } from '../actions/messages';
import { GameActionType, GameAction } from '../actions/game';
import { setupGame, fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { State } from '../../game-engine/application-states';
import Move from '../../game-engine/Move';
import { Wallet, WalletFundingAction, WalletFundingActionType } from '../../wallet';

export default function* applicationControllerSaga(wallet: Wallet) {
  let gameEngine: GameEngine | null = null;

  const actionTypesFilter = [
    GameActionType.CHOOSE_OPPONENT,
    MessageActionType.MESSAGE_RECEIVED,
    GameActionType.MOVE_SENT,
    GameActionType.CHOOSE_PLAY,
    WalletFundingActionType.WALLETFUNDING_FUNDED,
    WalletFundingActionType.WALLETFUNDING_REQUEST,
  ];
  const channel = yield actionChannel(actionTypesFilter);

  while (true) {
    let newState: State | null = null;
    const action: GameAction | MessageAction | WalletFundingAction = yield take(channel);

    if (gameEngine == null) {
      switch (action.type) {
        case GameActionType.CHOOSE_OPPONENT:
          const { opponent, stake } = action;
          const balances = [3 * stake, 3 * stake];
          gameEngine = setupGame({ opponent, stake, balances, wallet });
          newState = gameEngine.state;
          break;
        case MessageActionType.MESSAGE_RECEIVED:
          gameEngine = fromProposal({ move: Move.fromHex(action.message), wallet });
          if (gameEngine !== null) {
            newState = gameEngine.state;
          }
          break;
        default:
        // do nothing
      }
    } else {
      switch (action.type) {
        case MessageActionType.MESSAGE_RECEIVED:
          newState = gameEngine.receiveMove(Move.fromHex(action.message));
          break;
        case GameActionType.MOVE_SENT:
          newState = gameEngine.moveSent();
          break;
        case GameActionType.CHOOSE_PLAY:
          newState = gameEngine.choosePlay(action.play);
          break;
        case WalletFundingActionType.WALLETFUNDING_FUNDED:
          const adjudicator = { action };
          // TODO: We'll need the gameEngine to handle what happens if the funding fails for some reason
          newState = gameEngine.fundingConfirmed({ adjudicator });
          // We've received funding so we need to update the game state again
          break;
        case WalletFundingActionType.WALLETFUNDING_REQUEST:
          newState = gameEngine.fundingRequested();
          break;
        default:
        // do nothing
      }
    }
    if (newState && gameEngine != null) {
      if (newState.isReadyToSend) {
        yield put(MessageAction.sendMessage(newState.opponentAddress, newState.move.toHex()));
        yield put(GameAction.moveSent(newState.move));
      }
      if (newState.isReadyForFunding) {
        yield put(WalletFundingAction.walletFundingRequest(wallet, newState.player));
      }
      yield put(GameAction.stateChanged(newState));
    }
  }
}
