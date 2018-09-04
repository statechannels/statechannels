import { take, put, actionChannel } from 'redux-saga/effects';

import { MessageActionType, MessageAction } from '../actions/messages';
import { GameActionType, GameAction } from '../actions/game';
import { setupGame, fromProposal, GameEngine } from '../../game-engine/GameEngine';
import { State } from '../../game-engine/application-states';
import { default as positionFromHex } from '../../game-engine/positions/decode';
import { actions as walletActions } from '../../wallet';
import { PlayerAStateType } from '../../game-engine/application-states/PlayerA';
import { PlayerBStateType } from '../../game-engine/application-states/PlayerB';

export default function* applicationControllerSaga(address: string) {
  let gameEngine: GameEngine | null = null;

  const actionTypesFilter = [
    GameActionType.CHOOSE_OPPONENT,
    MessageActionType.MESSAGE_RECEIVED,
    GameActionType.CHOOSE_PLAY,
    walletActions.FUNDING_SUCCESS,
  ];
  const channel = yield actionChannel(actionTypesFilter);

  while (true) {
    const oldState: State | null = gameEngine && gameEngine.state;
    let newState: State | null = oldState;
    const action: GameAction | MessageAction | walletActions.FundingSuccess = yield take(channel);

    if (gameEngine == null) {
      switch (action.type) {
        case GameActionType.CHOOSE_OPPONENT:
          const { opponent, stake } = action;
          const balances = [3 * stake, 3 * stake];
          gameEngine = setupGame({ me: address, opponent, stake, balances });
          newState = gameEngine.state;
          break;
        case MessageActionType.MESSAGE_RECEIVED:
          try {
            gameEngine = fromProposal(positionFromHex(action.message));
            newState = gameEngine.state;
          } catch {
            // ignore "not a prefundsetup" error
          }
          break;
        default:
        // do nothing
      }
    } else {
      switch (action.type) {
        case MessageActionType.MESSAGE_RECEIVED:
          newState = gameEngine.receivePosition(positionFromHex(action.message));
          break;
        case GameActionType.CHOOSE_PLAY:
          newState = gameEngine.choosePlay(action.play);
          break;
        case walletActions.FUNDING_SUCCESS:
          // TODO: We'll need the gameEngine to handle what happens if the funding fails for some reason
          newState = gameEngine.fundingConfirmed();
          // We've received funding so we need to update the game state again
          break;
        default:
        // do nothing
      }
    }

    if (newState && newState !== oldState) {
      switch(newState.type) {
        case PlayerAStateType.WAIT_FOR_FUNDING:
        case PlayerBStateType.WAIT_FOR_FUNDING:
          yield put(walletActions.fundingRequest(newState.channelId));
          break;
        case PlayerAStateType.CHOOSE_PLAY:
        case PlayerBStateType.CHOOSE_PLAY:
          break; // don't send anything if the next step is to ChoosePlay
        default:
          yield put(MessageAction.sendMessage(newState.opponentAddress, newState.position.toHex()));
      }
      yield put(GameAction.stateChanged(newState));
    }
  }
}
