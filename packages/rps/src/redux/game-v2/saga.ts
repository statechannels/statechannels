import { take, select, call, put } from 'redux-saga/effects';
// import { take } from 'redux-saga/effects';
import { RPSChannelClient } from '../../utils/rps-channel-client';
import { AppData } from '../../core';
import { updateChannelState } from './actions';
import { GameState } from './state';

const getGameState = (state: any): GameState => state.game;

export function* gameSaga(channelClient: RPSChannelClient) {
  // const _gameState: GameState =
  while (true) {
    yield take('*'); // run after every action

    const { localState, channelState }: GameState = yield select(getGameState);

    if (localState.type === 'GameChosen' && !channelState) {
      const openingBalance = localState.roundBuyIn.mul(5);
      const startState: AppData = { type: 'start' };
      const newChannelState = yield call(
        channelClient.createChannel,
        localState.address,
        localState.opponentAddress,
        openingBalance,
        openingBalance,
        startState
      );
      yield put(updateChannelState(newChannelState));
    }
  }

  // player A
  // ========
  // if (isPlayerA(gameState)) {
  //   if (challengeSelected(gameState)) {
  //     yield call(openChannel, gameState, channelClient);
  //   } else if(inStartState(gameState) && weaponChosen(gameState)) {
  //     yield call(proposeGame);
  //   } else if inRoundAcceptedState(gameState) {
  //     yield call(revealWeapon)
  //   } else if (inStartState(gameState) && !playAgain(gameState)) {
  //     yield call(concludeGame)
  //   }
  // }
  // if challengeSelected and no channelState
  // call openChannel
  // if appData.type == "resting" and myWeapon exists
  // then formulate propose and call update state
  // if appData.type == "accept"
  // then formulate reveal and call update state
  // if in reveal, formulate the result and whether enough funds to play again
  // if in resting, and don't want to play again
  // formulate conclude
  // if in resting or accept and resign
  // formulate conclude
  // player b
  // ========
  // if channelProposed, and has confirmed
  // call joinChannel
}
