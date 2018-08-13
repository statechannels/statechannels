import { take, put } from 'redux-saga/effects';

import { MessageActionType } from '../actions/messages';
import { GameActionType, GameAction } from '../actions/game';
import ChannelWallet from '../../game-engine/ChannelWallet';
import { setupGame, fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { State } from '../../game-engine/application-states';

export default function* applicationControllerSaga(wallet: ChannelWallet) {
  let gameEngine: GameEngine | null = null;
  let newState: State | null = null;

  while(true) {
    const action = yield take('*');

    if (gameEngine == null) {
      switch(action.type) {
        case GameActionType.CHOOSE_OPPONENT:
          const { opponent, stake } = action;
          const balances = [ 3 * stake, 3 * stake ];
          gameEngine = setupGame({opponent, stake, balances, wallet})
          newState = gameEngine.state;
          break;
        case MessageActionType.MESSAGE_RECEIVED:
          gameEngine = fromProposal({message: action.message, wallet});
          newState = gameEngine.state;
          break;
        default:
          // do nothing
      }
    } else {
      switch(action.type) {
        case MessageActionType.MESSAGE_RECEIVED:
          newState = gameEngine.receiveMessage(action.message);
          break;
        case GameActionType.MESSAGE_SENT:
          newState = gameEngine.messageSent();
          break;
        case GameActionType.CHOOSE_A_PLAY:
          newState = gameEngine.choosePlay(action.aPlay);
          break;
        case GameActionType.EVENT_RECEIVED:
          newState = gameEngine.receiveEvent(action.event);
          break;
        default:
          // do nothing
      }
    }

    if (newState) { yield put(GameAction.stateChanged(newState)) };
  }
}
