import { expectSaga } from 'redux-saga-test-plan';
import { combineReducers } from 'redux';
import { gameReducer } from '../reducer';
import { gameSaga } from '../saga';
import { localStatesA, bName, bAddress, stake, channelStates, aWeapon, salt } from './scenarios';
import { joinOpenGame, chooseWeapon, updateChannelState } from '../actions';
import { ChannelState } from '../../../core';
import { RPSChannelClient } from '../../../utils/rps-channel-client';
import * as match from 'redux-saga-test-plan/matchers';
import { randomHex } from '../../../utils/randomHex';

// need to get the same shape, so that selecting state in the saga works
const reducer = combineReducers({
  game: gameReducer,
});

const gameState = (localState, channelState?: ChannelState) => ({
  game: {
    localState,
    channelState,
  },
});

describe('when joining an open game', () => {
  it('calls createChannel and transitions to GameChosen', async () => {
    const initialState = gameState(localStatesA.lobby);
    const client = new RPSChannelClient();
    const action = joinOpenGame(bName, bAddress, stake);

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([[match.call.fn(client.createChannel), Promise.resolve(channelStates.preFund0)]])
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesA.gameChosen, channelStates.preFund0));
  });
});

// moving to chooseWeapon when game is accepted

describe('when chosing a weapon', () => {
  it('generates a salt, calls updateState, and finishes in WeaponAndSaltChosen', async () => {
    const initialState = gameState(localStatesA.chooseWeapon, channelStates.start);
    const client = new RPSChannelClient();
    const action = chooseWeapon(aWeapon);

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([
        [match.call.fn(randomHex), salt],
        [match.call.fn(client.updateChannel), Promise.resolve(channelStates.roundProposed)],
      ])
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(
      gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed)
    );
  });
});

describe("when the opponent's move arrives", () => {
  it('calls updateState and transitions to ResultPlayAgain', async () => {
    const initialState = gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed);
    const client = new RPSChannelClient();
    const action = updateChannelState(channelStates.roundAccepted); // triggered by ChannelUpdatedListener

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([[match.call.fn(client.updateChannel), Promise.resolve(channelStates.reveal)]])
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesA.resultPlayAgain, channelStates.reveal));
  });
});

// when we select to play again
