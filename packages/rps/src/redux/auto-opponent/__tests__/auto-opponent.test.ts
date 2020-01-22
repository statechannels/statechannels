import {RPSChannelClient} from '../../../utils/rps-channel-client';
import {fork} from 'redux-saga/effects';
import {expectSaga} from 'redux-saga-test-plan';
import {Setup} from '../../game/state';
import {gameSaga} from '../../game/saga';
import {combineReducers} from 'redux';
import {gameReducer} from '../../game/reducer';
import {openGamesReducer} from '../../open-games/reducer';
import {channelUpdatedListener} from '../../message-service/channel-updated-listener';
import {autoPlayer, autoOpponent} from '../';
import {FakeChannelClient} from '@statechannels/channel-client';

const SUFFICIENT_TIME_TO_GET_TO_TURNUM_16 = 7000; // test will take at least this long to run
const reducer = combineReducers({
  game: gameReducer,
  openGames: openGamesReducer,
});

it(
  'runs to GameOver',
  async () => {
    const client = new RPSChannelClient(new FakeChannelClient('0xOpponent'));
    function* saga() {
      yield fork(gameSaga, client);
      yield fork(autoPlayer, 'A');
      yield fork(autoOpponent, 'B', client);
      yield fork(channelUpdatedListener, client);
    }
    const initialState = {
      game: {
        localState: Setup.lobby({name: 'Player A', address: 'blah', outcomeAddress: 'blah'}),
        channelState: null,
      },
      openGames: [],
    };

    const {storeState} = await expectSaga(saga)
      .withReducer(reducer, initialState)
      .silentRun(SUFFICIENT_TIME_TO_GET_TO_TURNUM_16); // Kill the saga after (hopefully) enough time. Brittle.
    expect(storeState.game.localState.type).toEqual('EndGame.GameOver');
  },
  SUFFICIENT_TIME_TO_GET_TO_TURNUM_16 + 1000
); // We don't want jest to timeout
