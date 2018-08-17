import { take, put, actionChannel } from 'redux-saga/effects';

import { MessageActionType, MessageAction } from '../actions/messages';
import { GameActionType, GameAction } from '../actions/game';
import ChannelWallet from '../../game-engine/ChannelWallet';
import { setupGame, fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { State } from '../../game-engine/application-states';
import Move from '../../game-engine/Move';
import { ReadyToDeploy } from '../../game-engine/application-states/PlayerA';

export default function* applicationControllerSaga(wallet: ChannelWallet) {
  let gameEngine: GameEngine | null = null;

  const channel = yield actionChannel('*');

  while(true) {
    let newState: State | null = null;
    const action: GameAction | MessageAction = yield take(channel);

    if (gameEngine == null) {
      switch(action.type) {
        case GameActionType.CHOOSE_OPPONENT:
          const { opponent, stake } = action;
          const balances = [ 3 * stake, 3 * stake ];
          gameEngine = setupGame({opponent, stake, balances, wallet})
          newState = gameEngine.state;
          break;
        case MessageActionType.MESSAGE_RECEIVED:
          gameEngine = fromProposal({move: Move.fromHex(action.message), wallet});
          newState = gameEngine.state;
          break;
        default:
          // do nothing
      }
    } else {
      switch(action.type) {
        case MessageActionType.MESSAGE_RECEIVED:
          newState = gameEngine.receiveMove(Move.fromHex(action.message));
          break;
        case GameActionType.MOVE_SENT:
          newState = gameEngine.moveSent();
          break;
        case GameActionType.CHOOSE_PLAY:
          newState = gameEngine.choosePlay(action.play);
          break;
        case GameActionType.EVENT_RECEIVED:
          newState = gameEngine.receiveEvent(action.event);
          break;
        default:
          // do nothing
      }
    }

    if (newState) {
      if (newState.isReadyToSend) {

        yield put(MessageAction.sendMessage(newState.opponentAddress, newState.move.toHex()))
        yield put(GameAction.moveSent(newState.move));
      }
      // Fake sending a transaction for now
      if (newState instanceof ReadyToDeploy && gameEngine){
          gameEngine!.transactionSent();
          newState = gameEngine.state;
      }
      // TODO: Once we stop faking the transaction we won't need this null check
      if (newState){
        yield put(GameAction.stateChanged(newState));
      }
    }
  }
}
