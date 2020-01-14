import {expectSaga} from 'redux-saga-test-plan';
import {combineReducers} from 'redux';
import {gameReducer} from '../reducer';
import {gameSaga} from '../saga';
import {localStatesB, stake, channelStates, aName, aAddress, bWeapon} from './scenarios';
import {
  chooseWeapon,
  updateChannelState,
  playAgain,
  resign,
  createGame,
  gameJoined,
  gameOver,
  newOpenGame,
  cancelGame,
} from '../actions';
import {ChannelState} from '../../../core';
import {RPSChannelClient} from '../../../utils/rps-channel-client';
import {rpsChannelClientMocks} from './helpers';
import {FakeChannelClient} from '@statechannels/channel-client';

// need to get the same shape, so that selecting state in the saga works
const reducer = combineReducers({
  game: gameReducer,
});

const client = new RPSChannelClient(new FakeChannelClient('0xOpponent'));
const {callJoinChannel, callUpdateChannel, callCloseChannel} = rpsChannelClientMocks(client);

const gameState = (localState, channelState?: ChannelState) => ({
  game: {
    localState,
    channelState: channelState || null,
  },
});

describe('when in Lobby and clicking "create a game"', () => {
  it('moves to CreateOpenGame', async () => {
    const initialState = gameState(localStatesB.lobby);
    const action = newOpenGame();

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesB.createOpenGame));
  });
});

describe('when in CreateOpenGame and creating a game', () => {
  it('moves to the WaitingRoom', async () => {
    const initialState = gameState(localStatesB.createOpenGame);
    const action = createGame(stake);

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesB.waitingRoom));
  });
});

describe('when in WaitingRoom and clicking cancel', () => {
  it('moves to the WaitingRoom', async () => {
    const initialState = gameState(localStatesB.waitingRoom);
    const action = cancelGame();

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesB.lobby));
  });
});

describe('when opponent joins your game', () => {
  describe('and the channel update arrives first', () => {
    it('calls joinChannel and transitions to OpponentJoined', async () => {
      const initialState = gameState(localStatesB.waitingRoom);
      const appNotification = gameJoined(aName, aAddress, aAddress);
      const channelUpdate = updateChannelState(channelStates.preFund0);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(channelUpdate)
        .dispatch(appNotification)
        .provide([callJoinChannel(channelStates.preFund1)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesB.opponentJoined, channelStates.preFund1));
    });
  });
  describe('and the app notification update arrives first', () => {
    it('calls joinChannel and transitions to OpponentJoined', async () => {
      const initialState = gameState(localStatesB.waitingRoom);
      const appNotification = gameJoined(aName, aAddress, aAddress);
      const channelUpdate = updateChannelState(channelStates.preFund0);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(appNotification)
        .dispatch(channelUpdate)
        .provide([callJoinChannel(channelStates.preFund1)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesB.opponentJoined, channelStates.preFund1));
    });
  });
});

describe('when funding completes', () => {
  it('player B moves to chooseWeapon', async () => {
    const initialState = gameState(localStatesB.opponentJoined, channelStates.postFund1);
    const action = updateChannelState(channelStates.ready);

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesB.chooseWeapon, channelStates.ready));
  });
});

describe('when choosing a weapon as player B', () => {
  describe('and player A has already sent their state', () => {
    it('updates the channel state and transitions to WeaponChosen', async () => {
      const initialState = gameState(localStatesB.chooseWeapon, channelStates.roundProposed);
      const action = chooseWeapon(bWeapon);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.roundAccepted)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesB.weaponChosen, channelStates.roundAccepted));
    });
  });

  describe("and player A hasn't sent their state yet", () => {
    it('transitions to WeaponChosen', async () => {
      const initialState = gameState(localStatesB.chooseWeapon, channelStates.postFund1);
      const action = chooseWeapon(bWeapon);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesB.weaponChosen, channelStates.postFund1));
    });
    it("updates the channel state when player A's state arrives", async () => {
      const initialState = gameState(localStatesB.weaponChosen, channelStates.postFund1);
      const action = updateChannelState(channelStates.roundProposed); // triggered when state arrives

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callUpdateChannel(channelStates.roundAccepted)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesB.weaponChosen, channelStates.roundAccepted));
    });
  });
});

describe('when player B receives the reveal', () => {
  describe('and there are sufficient funds to continue', () => {
    it('transitions to ResultPlayAgain', async () => {
      const initialState = gameState(localStatesB.weaponChosen, channelStates.roundAccepted);
      const action = updateChannelState(channelStates.reveal); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(gameState(localStatesB.resultPlayAgain, channelStates.reveal));
    });
  });
  describe('and player B is out of funds', () => {
    it('calls closeChannel and transitions to InsufficientFunds', async () => {
      const initialState = gameState(
        localStatesB.weaponChosen,
        channelStates.roundAcceptedInsufficientFundsB
      );
      const action = updateChannelState(channelStates.revealInsufficientFundsB); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeInsufficientFundsB)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesB.insufficientFunds, channelStates.concludeInsufficientFundsB)
      );
    });
  });
});

describe('when player B decides to play again', () => {
  it('sends the new start state and transitions to ChooseWeapon', async () => {
    const initialState = gameState(localStatesB.resultPlayAgain, channelStates.reveal);
    const action = playAgain();

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .provide([callUpdateChannel(channelStates.start2)])
      .run({silenceTimeout: true});

    expect(storeState).toEqual(gameState(localStatesB.chooseWeapon2, channelStates.start2));
  });
});

describe('when the player resigns (which includes deciding not to play again)', () => {
  describe("and it's their turn", () => {
    it('transitions to ShuttingDown and calls closeChannel', async () => {
      // if we're in postFund1, it's A's turn
      const initialState = gameState(localStatesB.chooseWeapon, channelStates.roundProposed);
      const action = resign(true);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeFromProposed)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesB.resignedTheirTurn, channelStates.concludeFromProposed)
      );
    });
  });

  describe("and it isn't their turn", () => {
    it('transitions to ShuttingDown', async () => {
      // if we're in roundProposed, it's B's turn
      const initialState = gameState(localStatesB.chooseWeapon, channelStates.postFund1);
      const action = resign(true);

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesB.resignedTheirTurn, channelStates.postFund1)
      );
    });

    it('later calls closeChannel, when another state arrives', async () => {
      const initialState = gameState(localStatesB.resignedTheirTurn, channelStates.postFund1);
      const action = updateChannelState(channelStates.roundProposed); // triggered by ChannelUpdatedListener

      const {storeState} = await expectSaga(gameSaga as any, client)
        .withReducer(reducer, initialState)
        .dispatch(action)
        .provide([callCloseChannel(channelStates.concludeFromProposed)])
        .run({silenceTimeout: true});

      expect(storeState).toEqual(
        gameState(localStatesB.resignedTheirTurn, channelStates.concludeFromProposed)
      );
    });
  });
});

describe('when in Resigned and user clicks on button', () => {
  it('transitions to game over', async () => {
    const initialState = gameState(
      localStatesB.resignedTheirTurn,
      channelStates.concludeFromAccepted
    );
    const action = gameOver();

    const {storeState} = await expectSaga(gameSaga as any, client)
      .withReducer(reducer, initialState)
      .dispatch(action)
      .run({silenceTimeout: true});

    expect(storeState).toEqual(
      gameState(localStatesB.gameOver, channelStates.concludeFromAccepted)
    );
  });
});
