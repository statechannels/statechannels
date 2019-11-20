import { expectSaga } from 'redux-saga-test-plan';
import { combineReducers } from 'redux';
import { gameReducer } from '../reducer';
import { gameSaga } from '../saga';
import { localStatesA, bName, bAddress, stake, channelStates, aWeapon, salt } from './scenarios';
import { joinOpenGame, chooseWeapon, updateChannelState, playAgain } from '../actions';
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
    channelState: channelState || null,
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
  describe('and there are sufficient funds to continue', () => {
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

  describe('and player A is out of funds', () => {
    it('calls updateState and transitions to ShuttingDown', async () => {
      const initialState = gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed);
      const client = new RPSChannelClient();
      const action = updateChannelState(channelStates.roundAcceptedInsufficientFundsB); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([
          [
            match.call.fn(client.updateChannel),
            Promise.resolve(channelStates.revealInsufficientFundsB),
          ],
        ])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(
        gameState(localStatesA.shuttingDown, channelStates.revealInsufficientFundsB)
      );
    });
  });
});

describe('when player decides to play again', () => {
  describe('and the opponent has already decided to play again', () => {
    it('transitions to ChooseWeapon', async () => {
      // being in start2 === we know the opponent has decided to play again
      const initialState = gameState(localStatesA.resultPlayAgain, channelStates.start2);
      const client = new RPSChannelClient();
      const action = playAgain();

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesA.chooseWeapon2, channelStates.start2));
    });
  });
  describe("and the opponent hasn't decided whether to play again yet", () => {
    it('transitions to WaitForRestart', async () => {
      // if the channel is still in the reveal state, the opponent hasn't decided whether to play again yet
      const initialState = gameState(localStatesA.resultPlayAgain, channelStates.reveal);
      const client = new RPSChannelClient();
      const action = playAgain();

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesA.waitForRestart, channelStates.reveal));
    });
    it('then transitions to ChooseWeapon, when the opponent decides', async () => {
      const initialState = gameState(localStatesA.waitForRestart, channelStates.reveal);
      const client = new RPSChannelClient();
      const action = updateChannelState(channelStates.start2); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesA.chooseWeapon2, channelStates.start2));
    });
  });
});

describe.skip('when a player resigns (which includes deciding not to play again)', () => {
  describe("and it's their turn", () => {
    it('transitions to ShuttingDown and calls closeChannel', () => {});
  });
  describe("and it isn't their turn", () => {
    it('transitions to ShuttingDown', () => {});

    it('later calls closeChannel, when another state arrives', () => {});
  });
});
// resign whenever takes you to a "closing game"
// then to a game closed

// receiving a resign => your opponent decided not to play again or your opponent abandoned
