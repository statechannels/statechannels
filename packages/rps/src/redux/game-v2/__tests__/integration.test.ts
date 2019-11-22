import { expectSaga } from 'redux-saga-test-plan';
import { combineReducers } from 'redux';
import { gameReducer } from '../reducer';
import { gameSaga } from '../saga';
import {
  localStatesA,
  localStatesB,
  bName,
  bAddress,
  stake,
  channelStates,
  aWeapon,
  salt,
  aName,
  aAddress,
  bWeapon,
} from './scenarios';
import {
  joinOpenGame,
  chooseWeapon,
  updateChannelState,
  playAgain,
  resign,
  createGame,
  gameJoined,
} from '../actions';
import { ChannelState } from '../../../core';
import { RPSChannelClient } from '../../../utils/rps-channel-client';
import * as match from 'redux-saga-test-plan/matchers';
import { randomHex } from '../../../utils/randomHex';

// need to get the same shape, so that selecting state in the saga works
const reducer = combineReducers({
  game: gameReducer,
});

// checks and mocks a createChannel call, in the format expected by expectSaga.provide
const callCreateChannel = (state: ChannelState): [match.Matcher, any] => [
  match.call(
    client.createChannel,
    state.aDestination,
    state.bDestination,
    state.aBal,
    state.bBal,
    state.appData
  ),
  Promise.resolve(state),
];
// checks and mocks a joinChannel call, in the format expected by expectSaga.provide
const callJoinChannel = (state: ChannelState): [match.Matcher, any] => [
  match.call(client.joinChannel, state.channelId),
  Promise.resolve(state),
];
// checks and mocks an updateChannel call, in the format expected by expectSaga.provide
const callUpdateChannel = (state: ChannelState): [match.Matcher, any] => [
  match.call(client.updateChannel, state.channelId, state.aBal, state.bBal, state.appData),
  Promise.resolve(state),
];
// checks and mocks a closeChannel call, in the format expected by expectSaga.provide
const callCloseChannel = (state: ChannelState): [match.Matcher, any] => [
  match.call(client.closeChannel, state.channelId),
  Promise.resolve(state),
];

const gameState = (localState, channelState?: ChannelState) => ({
  game: {
    localState,
    channelState: channelState || null,
  },
});

const client = new RPSChannelClient();

describe('when creating a game', () => {
  it('moves to the WaitingRoom', async () => {
    const initialState = gameState(localStatesB.lobby);
    const action = createGame(stake);

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesB.waitingRoom));
  });
});

describe('when joining an open game', () => {
  it('calls createChannel and transitions to GameChosen', async () => {
    const initialState = gameState(localStatesA.lobby);
    const action = joinOpenGame(bName, bAddress, stake);
    const state = channelStates.preFund0;

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([callCreateChannel(state)])
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesA.gameChosen, channelStates.preFund0));
  });
});

describe('when opponent joins your game', () => {
  describe('and the channel update arrives first', () => {
    it('calls joinChannel and transitions to OpponentJoined', async () => {
      const initialState = gameState(localStatesB.waitingRoom);
      const appNotification = gameJoined(aName, aAddress);
      const channelUpdate = updateChannelState(channelStates.preFund0);

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(channelUpdate)
        .dispatch(appNotification)
        .provide([callJoinChannel(channelStates.preFund1)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesB.opponentJoined, channelStates.preFund1));
    });
  });
  describe('and the app notification update arrives first', () => {
    it('calls joinChannel and transitions to OpponentJoined', async () => {
      const initialState = gameState(localStatesB.waitingRoom);
      const appNotification = gameJoined(aName, aAddress);
      const channelUpdate = updateChannelState(channelStates.preFund0);

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(appNotification)
        .dispatch(channelUpdate)
        .provide([callJoinChannel(channelStates.preFund1)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesB.opponentJoined, channelStates.preFund1));
    });
  });
});

describe('when funding completes', () => {
  it('player A moves to chooseWeapon', async () => {
    const initialState = gameState(localStatesA.gameChosen, channelStates.postFund1);
    const action = updateChannelState(channelStates.ready);

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesA.chooseWeapon, channelStates.ready));
  });
  it('player B moves to chooseWeapon', async () => {
    const initialState = gameState(localStatesB.opponentJoined, channelStates.postFund1);
    const action = updateChannelState(channelStates.ready);

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesB.chooseWeapon, channelStates.ready));
  });
});

describe('when chosing a weapon as player A', () => {
  it('generates a salt, calls updateState, and finishes in WeaponAndSaltChosen', async () => {
    const initialState = gameState(localStatesA.chooseWeapon, channelStates.postFund1);
    const action = chooseWeapon(aWeapon);

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([[match.call.fn(randomHex), salt], callUpdateChannel(channelStates.roundProposed)])
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(
      gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed)
    );
  });
});

describe('when choosing a weapon as player B', () => {
  describe('and player A has already sent their state', () => {
    it('updates the channel state and transitions to WeaponChosen', async () => {
      const initialState = gameState(localStatesB.chooseWeapon, channelStates.roundProposed);
      const action = chooseWeapon(bWeapon);

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.roundAccepted)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesB.weaponChosen, channelStates.roundAccepted));
    });
  });

  describe("and player A hasn't sent their state yet", () => {
    it('transitions to WeaponChosen', async () => {
      const initialState = gameState(localStatesB.chooseWeapon, channelStates.postFund1);
      const action = chooseWeapon(bWeapon);

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesB.weaponChosen, channelStates.postFund1));
    });
    it("updates the channel state when player A's state arrives", async () => {
      const initialState = gameState(localStatesB.weaponChosen, channelStates.postFund1);
      const action = updateChannelState(channelStates.roundProposed); // triggered when state arrives

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.roundAccepted)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesB.weaponChosen, channelStates.roundAccepted));
    });
  });
});

describe("when player A receives player B's move", () => {
  describe('and there are sufficient funds to continue', () => {
    it('calls updateState and transitions to ResultPlayAgain', async () => {
      const initialState = gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed);
      const action = updateChannelState(channelStates.roundAccepted); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.reveal)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesA.resultPlayAgain, channelStates.reveal));
    });
  });

  describe('and player B is out of funds', () => {
    it('sends the reveal and transitions to ShuttingDown', async () => {
      const initialState = gameState(localStatesA.weaponAndSaltChosen, channelStates.roundProposed);
      const action = updateChannelState(channelStates.roundAcceptedInsufficientFundsB); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.revealInsufficientFundsB)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(
        gameState(localStatesA.shuttingDown, channelStates.revealInsufficientFundsB)
      );
    });
  });
});

describe('when player B receives the reveal', () => {
  describe('and there are sufficient funds to continue', () => {
    it('transitions to ResultPlayAgain', async () => {
      const initialState = gameState(localStatesB.weaponChosen, channelStates.roundAccepted);
      const action = updateChannelState(channelStates.reveal); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesB.resultPlayAgain, channelStates.reveal));
    });
  });
  describe('and player B is out of funds', () => {
    it('calls closeChannel and transitions to ShuttingDown', async () => {
      const initialState = gameState(
        localStatesB.weaponChosen,
        channelStates.roundAcceptedInsufficientFundsB
      );
      const action = updateChannelState(channelStates.revealInsufficientFundsB); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeInsufficientFundsB)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(
        gameState(localStatesB.shuttingDown, channelStates.concludeInsufficientFundsB)
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
      const action = playAgain();

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesA.waitForRestart, channelStates.reveal));
    });
    it('then transitions to ChooseWeapon, when the opponent decides', async () => {
      const initialState = gameState(localStatesA.waitForRestart, channelStates.reveal);
      const action = updateChannelState(channelStates.start2); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(gameState(localStatesA.chooseWeapon2, channelStates.start2));
    });
  });
});

describe('when player B decides to play again', () => {
  it('sends the new start state and transitions to ChooseWeapon', async () => {
    const initialState = gameState(localStatesB.resultPlayAgain, channelStates.reveal);
    const action = playAgain();

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([callUpdateChannel(channelStates.start2)])
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesB.chooseWeapon2, channelStates.start2));
  });
});

describe('when either player resigns (which includes deciding not to play again)', () => {
  describe("and it's their turn", () => {
    it('transitions to ShuttingDown and calls closeChannel', async () => {
      // if we're in postFund1, it's A's turn
      const initialState = gameState(localStatesA.chooseWeapon, channelStates.postFund1);
      const action = resign();

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeFromStart)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(
        gameState(localStatesA.shuttingDownResign, channelStates.concludeFromStart)
      );
    });
  });
  describe("and it isn't their turn", () => {
    it('transitions to ShuttingDown', async () => {
      // if we're in roundProposed, it's B's turn
      const initialState = gameState(localStatesA.chooseWeapon, channelStates.roundProposed);
      const action = resign();

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(
        gameState(localStatesA.shuttingDownResign, channelStates.roundProposed)
      );
    });

    it('later calls closeChannel, when another state arrives', async () => {
      const initialState = gameState(localStatesA.shuttingDownResign, channelStates.roundProposed);
      const action = updateChannelState(channelStates.roundAccepted); // triggered by ChannelUpdatedListener

      const { storeState } = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeFromAccepted)])
        .run({ silenceTimeout: true });

      expect(storeState).toEqual(
        gameState(localStatesA.shuttingDownResign, channelStates.concludeFromAccepted)
      );
    });
  });
});

// when the opponent resigns

describe('when the channel is closed', () => {
  it('transitions to game over', async () => {
    const initialState = gameState(localStatesA.shuttingDownResign, channelStates.roundProposed);
    const action = updateChannelState(channelStates.closed); // triggered by ChannelUpdatedListener

    const { storeState } = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({ silenceTimeout: true });

    expect(storeState).toEqual(gameState(localStatesA.gameOverYouResigned, channelStates.closed));
  });
});
