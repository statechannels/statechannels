import {expectSaga} from 'redux-saga-test-plan';
import {combineReducers} from 'redux';
import {gameReducer} from '../reducer';
import {gameSaga} from '../saga';
import {localStatesA, bName, bAddress, stake, channelStates, aWeapon, salt} from './scenarios';
import {
  joinOpenGame,
  chooseWeapon,
  updateChannelState,
  playAgain,
  resign,
  gameOver,
} from '../actions';
import {ChannelState} from '../../../core';
import * as match from 'redux-saga-test-plan/matchers';
import {RPSChannelClient} from '../../../utils/rps-channel-client';
import {randomHex} from '../../../utils/randomHex';
import {rpsChannelClientMocks} from './helpers';
import {FakeChannelClient} from '@statechannels/channel-client';

// need to get the same shape, so that selecting state in the saga works
const reducer = combineReducers({
  game: gameReducer,
});

const client = new RPSChannelClient(new FakeChannelClient('0xOpponent'));
const {callCreateChannel, callUpdateChannel, callCloseChannel} = rpsChannelClientMocks(client);

const gameState = (localState, channelState?: ChannelState) => ({
  game: {
    localState,
    channelState: channelState || null,
  },
});

describe('when joining an open game', () => {
  it('calls createChannel and transitions to GameChosen', async () => {
    const initialState = gameState(localStatesA.lobby);
    const action = joinOpenGame(bName, bAddress, bAddress, stake);

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([callCreateChannel(channelStates.preFund0)])
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesA.gameChosen, channelStates.preFund0));
  });
});

describe('when funding completes', () => {
  it('player A moves to chooseWeapon', async () => {
    const initialState = gameState(localStatesA.gameChosen, channelStates.postFund1);
    const action = updateChannelState(channelStates.ready);

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesA.chooseWeapon, channelStates.ready));
  });
});

describe('when chosing a weapon as player A', () => {
  it('generates a salt, calls updateState, and finishes in WeaponAndSaltChosen', async () => {
    const initialState = gameState(localStatesA.chooseWeapon, channelStates.postFund1);
    const action = chooseWeapon(aWeapon);

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([[match.call.fn(randomHex), salt], callUpdateChannel(channelStates.roundProposed)])
      .run({silenceTimeout: true});

    expect(storeState).toEqual(
      gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed)
    );
  });
});

describe("when player A receives player B's move", () => {
  describe('and there are sufficient funds to continue', () => {
    it('calls updateState and transitions to ResultPlayAgain', async () => {
      const initialState = gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed);
      const action = updateChannelState(channelStates.roundAccepted); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.reveal)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesA.resultPlayAgain, channelStates.reveal));
    });
  });

  describe('and player B is out of funds', () => {
    it('sends the reveal and transitions to InsufficientFunds', async () => {
      const initialState = gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed);
      const action = updateChannelState(channelStates.roundAcceptedInsufficientFundsB); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.revealInsufficientFundsB)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesA.insuffcientFunds, channelStates.revealInsufficientFundsB)
      );
    });
  });
});

describe('when player A decides to play again', () => {
  describe('and the opponent has already decided to play again', () => {
    it('transitions to ChooseWeapon', async () => {
      // being in start2 === we know the opponent has decided to play again
      const initialState = gameState(localStatesA.resultPlayAgain, channelStates.start2);
      const action = playAgain();

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesA.chooseWeapon2, channelStates.start2));
    });
  });
  describe("and the opponent hasn't decided whether to play again yet", () => {
    it('transitions to WaitForRestart', async () => {
      // if the channel is still in the reveal state, the opponent hasn't decided whether to play again yet
      const initialState = gameState(localStatesA.resultPlayAgain, channelStates.reveal);
      const action = playAgain();

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesA.waitForRestart, channelStates.reveal));
    });
    it('then transitions to ChooseWeapon, when the opponent decides', async () => {
      const initialState = gameState(localStatesA.waitForRestart, channelStates.reveal);
      const action = updateChannelState(channelStates.start2); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesA.chooseWeapon2, channelStates.start2));
    });
  });
});

describe('when the player resigns (which includes deciding not to play again)', () => {
  describe("and it's their turn", () => {
    it('transitions to Resigned and calls closeChannel', async () => {
      // if we're in postFund1, it's A's turn
      const initialState = gameState(localStatesA.chooseWeapon, channelStates.postFund1);
      const action = resign(true);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeFromStart)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesA.resignedMyTurn, channelStates.concludeFromStart)
      );
    });
  });
  describe("and it isn't their turn", () => {
    it('transitions to Resigned', async () => {
      // if we're in roundProposed, it's B's turn
      const initialState = gameState(localStatesA.chooseWeapon, channelStates.roundProposed);
      const action = resign(true);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesA.resignedTheirTurn, channelStates.roundProposed)
      );
    });

    it('later calls closeChannel, when another state arrives', async () => {
      const initialState = gameState(localStatesA.resignedTheirTurn, channelStates.roundProposed);
      const action = updateChannelState(channelStates.roundAccepted); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeFromAccepted)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesA.resignedTheirTurn, channelStates.concludeFromAccepted)
      );
    });
  });
});

describe('when in Resigned and user clicks on button', () => {
  it('transitions to game over', async () => {
    const initialState = gameState(
      localStatesA.resignedTheirTurn,
      channelStates.concludeFromProposed
    );
    const action = gameOver();

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesA.gameOver, null));
  });
});
