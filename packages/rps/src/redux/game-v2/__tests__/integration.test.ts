import { expectSaga } from 'redux-saga-test-plan';
import { combineReducers } from 'redux';
import { gameReducer } from '../reducer';
import { gameSaga } from '../saga';
import { localStatesA, bName, bAddress, stake, channelStates } from './scenarios';
import { joinOpenGame } from '../actions';
import { ChannelState } from '../../../core';
import { RPSChannelClient } from '../../../utils/rps-channel-client';
import * as match from 'redux-saga-test-plan/matchers';

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

it('moves from the lobby', async () => {
  const client = new RPSChannelClient();
  const action = joinOpenGame(bName, bAddress, stake);

  const { storeState } = await expectSaga(gameSaga as any, client)
    .withReducer(reducer, gameState(localStatesA.lobby))
    .dispatch(action)
    .provide([[match.call.fn(client.createChannel), Promise.resolve(channelStates.preFund0)]])
    .run({ silenceTimeout: true });

  expect(storeState).toEqual(gameState(localStatesA.gameChosen, channelStates.preFund0));
});
