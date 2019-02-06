import { Reducer } from "redux";

import * as actions from "./actions";
import * as states from "./state";
import { Result, Imperative, Marker } from "../../core/results";

import {
  Player,
  isDraw,
  isWinningMarks,
  positions,
  Position
} from "../../core";
import { MessageState, sendMessage } from "../message-service/state";
import { LoginSuccess, LOGIN_SUCCESS, InitializeWalletSuccess, INITIALIZE_WALLET_SUCCESS } from "../login/actions";

import hexToBN from "../../utils/hexToBN";
import bnToHex from "../../utils/bnToHex";

import {
  PostFundSetupB,
  POST_FUND_SETUP_B,
  PLAY_AGAIN_ME_FIRST,
  PLAY_AGAIN_ME_SECOND,
} from "../../core/positions";

export interface JointState {
  gameState: states.GameState;
  messageState: MessageState;
}

const emptyJointState: JointState = {
  messageState: {},
  gameState: states.noName({ myAddress: "", libraryAddress: "" }),
};

export const gameReducer: Reducer<JointState> = (
  state = emptyJointState,
  action:
    | actions.GameAction
    | LoginSuccess
    | InitializeWalletSuccess
) => {
  if (
    action.type === actions.EXIT_TO_LOBBY &&
    state.gameState.name !== states.StateName.NoName
  ) {
    const myAddress =
      "myAddress" in state.gameState ? state.gameState.myAddress : "";
    const myName = "myName" in state.gameState ? state.gameState.myName : "";
    const newGameState = states.lobby({
      ...state.gameState,
      myAddress,
      myName,
    });
    return { gameState: newGameState, messageState: {} };
  }
  if (
    action.type === actions.MESSAGE_SENT
  ) {
    const { messageState, gameState } = state;
    const { actionToRetry } = messageState;
    return { gameState, messageState: { actionToRetry } };
  }
  if (action.type === LOGIN_SUCCESS) {
    const { messageState, gameState } = state;
    const { libraryAddress } = action;
    return { gameState: { ...gameState, libraryAddress }, messageState };
  }
  if (action.type === INITIALIZE_WALLET_SUCCESS) {
    const { messageState, gameState } = state;
    const { address: myAddress } = action;
    return { gameState: { ...gameState, myAddress }, messageState };
  }
  if (action.type === actions.CHALLENGE_RESPONSE_REQUESTED) {
    const { messageState, gameState } = state;
    if (gameState.name === states.StateName.OsPickMove) {
      return {
        gameState: states.osPickChallengeMove(gameState),
        messageState,
      };
    }
    if (gameState.name === states.StateName.XsPickMove) {
      return {
        gameState: states.xsPickChallengeMove(gameState),
        messageState,
      };
    }
  }
  // // apply the current action to the state
  state = singleActionReducer(state, action);
  // if we have saved an action previously, see if that will apply now
  state = attemptRetry(state);
  return state;
};

function attemptRetry(state: JointState): JointState {
  const { gameState } = state;
  let { messageState } = state;

  const actionToRetry = messageState.actionToRetry;
  if (actionToRetry) {
    messageState = { ...messageState, actionToRetry: undefined };
    state = singleActionReducer({ messageState, gameState }, actionToRetry);
  }
  return state;
}

function singleActionReducer(state: JointState, action: actions.GameAction) {
  const { messageState, gameState } = state;
  switch (gameState.name) {
    case states.StateName.NoName:
      return noNameReducer(gameState, messageState, action);
    case states.StateName.Lobby:
      return lobbyReducer(gameState, messageState, action);
    case states.StateName.CreatingOpenGame:
      return creatingOpenGameReducer(gameState, messageState, action);
    case states.StateName.WaitingRoom:
      return waitingRoomReducer(gameState, messageState, action);
    case states.StateName.WaitForGameConfirmationA:
      return waitForGameConfirmationAReducer(gameState, messageState, action);
    case states.StateName.ConfirmGameB:
      return confirmGameBReducer(gameState, messageState, action);
    case states.StateName.WaitForFunding:
      return waitForFundingReducer(gameState, messageState, action);
    case states.StateName.XsPickChallengeMove:
    case states.StateName.XsPickMove:
      if (
        action.type === actions.MARKS_MADE ||
        action.type === actions.RESIGN
      ) {
        return xsPickMoveReducer(gameState, messageState, action);
      } else {
        return state;
      }
    case states.StateName.OsPickChallengeMove:
    case states.StateName.OsPickMove:
      if (
        action.type === actions.MARKS_MADE ||
        action.type === actions.RESIGN
      ) {
        return osPickMoveReducer(gameState, messageState, action);
      } else {
        return state;
      }
    case states.StateName.XsWaitForOpponentToPickMove:
      if (
        action.type === actions.POSITION_RECEIVED ||
        action.type === actions.RESIGN || 
        action.type === actions.CREATE_CHALLENGE 
      ) {
        return xsWaitMoveReducer(gameState, messageState, action);
      } else {
        return state;
      }
    case states.StateName.OsWaitForOpponentToPickMove:
      if (
        action.type === actions.POSITION_RECEIVED ||
        action.type === actions.RESIGN || 
        action.type === actions.CREATE_CHALLENGE 
      ) {
        return osWaitMoveReducer(gameState, messageState, action);
      } else {
        return state;
      }
    case states.StateName.PlayAgain:
      return playAgainReducer(gameState, messageState, action);
    case states.StateName.WaitToPlayAgain:
      return waitToPlayAgainReducer(gameState, messageState, action);
    case states.StateName.GameOver:
      return gameOverReducer(gameState, messageState, action);
    case states.StateName.WaitForWithdrawal:
      return waitForWithdrawalReducer(gameState, messageState, action);
    default:
      return state;
  }
}

function noNameReducer(
  gameState: states.NoName,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  switch (action.type) {
    case actions.UPDATE_PROFILE:
      const { name, twitterHandle } = action;
      const { myAddress, libraryAddress } = gameState;

      const lobby = states.lobby({
        ...action,
        myName: name,
        myAddress,
        libraryAddress,
        twitterHandle,
      });
      return { gameState: lobby, messageState };
    default:
      return { gameState, messageState };
  }
}

function lobbyReducer(
  gameState: states.Lobby,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  switch (action.type) {
    case actions.NEW_OPEN_GAME:
      const newGameState = states.creatingOpenGame({ ...gameState });
      return { gameState: newGameState, messageState };
    case actions.JOIN_OPEN_GAME:
      const { roundBuyIn, opponentAddress } = action;
      const { myName, myAddress, libraryAddress, twitterHandle } = gameState;
      const balances = [
        hexToBN(roundBuyIn).muln(5),
        hexToBN(roundBuyIn).muln(5)
      ].map(bnToHex) as [string, string];
      const onScreenBalances = balances;
      const participants: [string, string] = [myAddress, opponentAddress];
      const turnNum = 0;
      const stateCount = 1;

      const waitForConfirmationState = states.waitForGameConfirmationA({
        ...action,
        myName,
        balances,
        onScreenBalances,
        participants,
        turnNum,
        stateCount,
        libraryAddress,
        twitterHandle,
        myAddress,
        player: Player.PlayerA,
      });

      messageState = sendMessage(
        positions.preFundSetupA(waitForConfirmationState),
        opponentAddress,
        messageState
      );
      return {
        gameState: { ...waitForConfirmationState },
        messageState,
      };
    default:
      return { gameState, messageState };
  }
}

function creatingOpenGameReducer(
  gameState: states.CreatingOpenGame,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  switch (action.type) {
    case actions.CREATE_OPEN_GAME:
      const newGameState = states.waitingRoom({
        ...gameState,
        roundBuyIn: action.roundBuyIn,
      });
      return { gameState: { ...newGameState }, messageState };
    case actions.CANCEL_OPEN_GAME:
      const newGameState1 = states.lobby(gameState);
      return { gameState: newGameState1, messageState };
    default:
      return { gameState, messageState };
  }
}

function waitingRoomReducer(
  gameState: states.WaitingRoom,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  switch (action.type) {
    case actions.INITIAL_POSITION_RECEIVED:
      const { position, opponentName } = action;
      const { myName, twitterHandle, myAddress } = gameState;

      if (position.name !== positions.PRE_FUND_SETUP_A) {
        return { gameState, messageState };
      }

      const newGameState = states.confirmGameB({
        ...position,
        myName,
        opponentName,
        twitterHandle,
        player: Player.PlayerB,
        onScreenBalances: position.balances,
        myAddress,
        you: Marker.noughts,
      });

      return { gameState: newGameState, messageState };
    case actions.CANCEL_OPEN_GAME:
      const newGameState1 = states.lobby(gameState);
      return { gameState: newGameState1, messageState };
    default:
      return { gameState, messageState };
  }
}

function challengeReducer(gameState: states.PlayingState, messageState: MessageState): JointState {

  messageState = { ...messageState, walletOutbox: { type: 'CHALLENGE_REQUESTED' } };

  return { gameState, messageState };
}


function waitForGameConfirmationAReducer(
  gameState: states.WaitForGameConfirmationA,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { 
    return challengeReducer(gameState, messageState); 
  }
  // only action we need to handle in this state is to receiving a PreFundSetupB
  if (action.type !== actions.POSITION_RECEIVED) {
    return { gameState, messageState };
  }
  if (action.position.name !== positions.PRE_FUND_SETUP_B) {
    return { gameState, messageState };
  }

  // request funding
  messageState = {
    ...messageState,
    walletOutbox: { type: "FUNDING_REQUESTED" },
  };

  // transition to Wait for Funding
  const newGameState = states.waitForFunding({
    ...gameState,
    turnNum: gameState.turnNum + 1,
  });

  return { messageState, gameState: newGameState };
}

function confirmGameBReducer(
  gameState: states.ConfirmGameB,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { return challengeReducer(gameState, messageState); }

  if (
    action.type !== actions.CONFIRM_GAME &&
    action.type !== actions.DECLINE_GAME
  ) {
    return { gameState, messageState };
  }

  if (action.type === actions.CONFIRM_GAME) {
    const newGameState = states.waitForFunding({
      ...gameState,
      turnNum: 1,
    });
    const newPosition = positions.preFundSetupB(newGameState);

    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(newPosition, opponentAddress, messageState);
    messageState = {
      ...messageState,
      walletOutbox: { type: "FUNDING_REQUESTED" },
    };

    return { gameState: { ...newGameState }, messageState };
  } else {
    const {
      myName,
      participants,
      libraryAddress,
      player,
      twitterHandle,
    } = gameState;
    // TODO: Probably should return to the waiting room instead of getting kicked back to the lobby
    const newGameState = states.lobby({
      myName,
      myAddress: participants[player],
      libraryAddress,
      twitterHandle,
    });
    // TODO: Send a message to the other player that the game has been declined
    return { gameState: newGameState, messageState };
  }
}

function waitForFundingReducer(
  gameState: states.WaitForFunding,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  const turnNum = gameState.turnNum;
  if (action.type === actions.FUNDING_FAILURE) {
    const { participants, player } = gameState;
    const lobbyGameState = states.lobby({
      ...gameState,
      myAddress: participants[player],
    });
    return { gameState: lobbyGameState, messageState: {} };
  }

  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { return challengeReducer(gameState, messageState); }

  if (action.type === actions.POSITION_RECEIVED) {
    const position = action.position;
    if (position.name !== positions.XPLAYING) {
      return { gameState, messageState };
    }
    messageState = { ...messageState, actionToRetry: action };
    return { gameState, messageState };
  }

  if (action.type === actions.FUNDING_SUCCESS) {
    if (action.position.name !== POST_FUND_SETUP_B) {
      throw new Error(
        "Game reducer expected PostFundSetupB on FUNDING_SUCCESS"
      );
    }
    const postFundPositionB = action.position as PostFundSetupB;
    const balances = postFundPositionB.balances;

    switch (gameState.player) {
      case Player.PlayerA:
        const newGameState1 = states.xsPickMove({
          ...gameState,
          turnNum: turnNum + 2,
          result: Imperative.Choose,
          noughts: 0,
          crosses: 0,
          onScreenBalances: balances,
          you: Marker.crosses,
        });
        return { gameState: newGameState1, messageState };
      case Player.PlayerB:
        const newGameState2 = states.osWaitForOpponentToPickMove({
          ...gameState,
          turnNum: turnNum + 2,
          noughts: 0,
          crosses: 0,
          onScreenBalances: balances,
          you: Marker.noughts,
          result: Imperative.Wait,
        });
        return { gameState: newGameState2, messageState };
    }
  }

  return { gameState, messageState };
}

function favorA(balances: [string, string], roundBuyIn): [string, string] {
  const aBal: string = bnToHex(hexToBN(balances[0]).add(hexToBN(roundBuyIn)));
  const bBal: string = bnToHex(hexToBN(balances[1]).sub(hexToBN(roundBuyIn)));
  return [aBal, bBal];
}

function favorB(balances: [string, string], roundBuyIn): [string, string] {
  const aBal: string = bnToHex(hexToBN(balances[0]).sub(hexToBN(roundBuyIn)));
  const bBal: string = bnToHex(hexToBN(balances[1]).add(hexToBN(roundBuyIn)));
  return [aBal, bBal];
}

function xsPickMoveReducer(
  gameState: states.XsPickMove | states.XsPickChallengeMove,
  messageState: MessageState,
  action: actions.MarksMade | actions.Resign
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }

  const { player, balances, roundBuyIn, noughts, crosses, turnNum } = gameState;
  const newCrosses = crosses + action.marks;
  let newBalances: [string, string] = balances;

  const opponentAddress = states.getOpponentAddress(gameState);
  let pos: Position = positions.draw({
    ...gameState,
    crosses: newCrosses,
    balances: newBalances,
    turnNum: turnNum + 1,
  }); // default
  let newGameState: states.GameState = states.playAgain({
    ...gameState,
    turnNum: turnNum + 1,
    result: Result.Tie,
  }); // default

  // if draw
  if (isDraw(noughts, newCrosses) && !isWinningMarks(newCrosses)) {
    switch (player) {
      case Player.PlayerA: {
        newBalances = favorA(balances, roundBuyIn);
        break;
      }
      case Player.PlayerB: {
        newBalances = favorB(balances, roundBuyIn);
        break;
      }
    }
    newGameState = states.playAgain({
      ...gameState,
      turnNum: turnNum + 1,
      crosses: newCrosses,
      result: Result.Tie,
      balances: newBalances,
      onScreenBalances: newBalances,
    });
    pos = positions.draw({ ...newGameState, crosses: newCrosses });
    if (gameState.name === states.StateName.XsPickChallengeMove) {
      messageState = {
        walletOutbox: { type: "RESPOND_TO_CHALLENGE", data: pos },
      };
    }
    if (gameState.name === states.StateName.XsPickMove) {
      messageState = sendMessage(pos, opponentAddress, messageState);
    }
    return {
      gameState: { ...newGameState },
      messageState,
    };
  }

  // if not draw then full swing to current player, unless its the first turn in a round
  switch (player) {
    case Player.PlayerA: {
      if (crosses !== 0) {
        newBalances = favorA(favorA(balances, roundBuyIn), roundBuyIn); // usually enact a full swing to current player
      } else {
        newBalances = favorA(balances, roundBuyIn); // if first move of a round, simply assign roundBuyIn to current player.
      }
      break;
    }
    case Player.PlayerB: {
      if (crosses !== 0) {
        newBalances = favorB(favorB(balances, roundBuyIn), roundBuyIn);
      } else {
        newBalances = favorB(balances, roundBuyIn);
      }
      break;
    }
  }

  // if inconclusive
  if (!isDraw(noughts, newCrosses) && !isWinningMarks(newCrosses)) {
    newGameState = states.xsWaitForOpponentToPickMove({
      ...gameState,
      turnNum: turnNum + 1,
      crosses: newCrosses,
      result: Imperative.Wait,
      balances: newBalances,
    });
    pos = positions.xPlaying({ ...newGameState });
  }

  // if winning move
  if (isWinningMarks(newCrosses)) {
    if (newBalances[0] >= roundBuyIn && newBalances[1] >= roundBuyIn) {
      newGameState = states.playAgain({
        ...gameState,
        turnNum: turnNum + 1,
        crosses: newCrosses,
        result: Result.YouWin,
        balances: newBalances,
        onScreenBalances: newBalances,
      });
      pos = positions.victory({ ...newGameState });
    } else {
      newGameState = states.gameOver({
        ...gameState,
        turnNum: turnNum + 1,
        crosses: newCrosses,
        balances: newBalances,
        onScreenBalances: newBalances,
        result: Result.YouWin,
      });
      pos = positions.victory({ ...newGameState });
    }
  }
  if (gameState.name === states.StateName.XsPickChallengeMove) {
    messageState = {
      walletOutbox: { type: "RESPOND_TO_CHALLENGE", data: pos },
    };
  }
  if (gameState.name === states.StateName.XsPickMove) {
    messageState = sendMessage(pos, opponentAddress, messageState);
  }
  return { gameState: { ...newGameState }, messageState };
}

function osPickMoveReducer(
  gameState: states.OsPickMove | states.OsPickChallengeMove,
  messageState: MessageState,
  action: actions.MarksMade | actions.Resign
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  const { player, balances, roundBuyIn, noughts, crosses, turnNum } = gameState;
  const newNoughts = noughts + action.marks;
  let newBalances: [string, string] = balances;

  const opponentAddress = states.getOpponentAddress(gameState);
  let pos: Position = positions.draw({
    ...gameState,
    noughts: newNoughts,
    balances: newBalances,
  }); // default
  let newGameState: states.GameState = states.playAgain({
    ...gameState,
    turnNum: turnNum + 1,
    noughts: newNoughts,
    result: Result.Tie,
  }); // default

  // if draw
  if (isDraw(newNoughts, crosses)) {
    switch (player) {
      case Player.PlayerA: {
        newBalances = favorA(balances, roundBuyIn);
        break;
      }
      case Player.PlayerB: {
        newBalances = favorB(balances, roundBuyIn);
        break;
      }
    }
    newGameState = states.playAgain({
      ...gameState,
      turnNum: turnNum + 1,
      noughts: newNoughts,
      result: Result.Tie,
      balances: newBalances,
      onScreenBalances: newBalances,
    });
    pos = positions.draw({
      ...newGameState,
      noughts: newNoughts,
      balances: newBalances,
    });
    if (gameState.name === states.StateName.OsPickChallengeMove) {
      messageState = {
        walletOutbox: { type: "RESPOND_TO_CHALLENGE", data: pos },
      };
    }
    if (gameState.name === states.StateName.OsPickMove) {
      messageState = sendMessage(pos, opponentAddress, messageState);
    }
    return {
      gameState: { ...newGameState },
      messageState,
    };
  }

  // if not draw then full swing to current player, unless its the first turn in a round
  switch (player) {
    case Player.PlayerA: {
      if (crosses !== 0) {
        newBalances = favorA(favorA(balances, roundBuyIn), roundBuyIn); // usually enact a full swing to current player
        console.log("full swing!");
      } else {
        newBalances = favorA(balances, roundBuyIn); // if first move of a round, simply assign roundBuyIn to current player.
        console.log("single swing!");
      }
      break;
    }
    case Player.PlayerB: {
      if (crosses !== 0) {
        newBalances = favorB(favorB(balances, roundBuyIn), roundBuyIn);
      } else {
        console.log("first move of the round");
        newBalances = favorB(balances, roundBuyIn);
      }
      break;
    }
  }

  // if inconclusive
  if (!isDraw(newNoughts, crosses) && !isWinningMarks(newNoughts)) {
    newGameState = states.osWaitForOpponentToPickMove({
      ...gameState,
      turnNum: turnNum + 1,
      noughts: newNoughts,
      result: Imperative.Wait,
      balances: newBalances,
    });
    pos = positions.oPlaying({ ...newGameState, noughts: newNoughts });
  }

  // if winning move
  if (isWinningMarks(newNoughts)) {
    if (newBalances[0] >= roundBuyIn && newBalances[1] >= roundBuyIn) {
      newGameState = states.playAgain({
        ...gameState,
        turnNum: turnNum + 1,
        noughts: newNoughts,
        result: Result.YouWin,
        balances: newBalances,
        onScreenBalances: newBalances,
      });
      pos = positions.victory({ ...newGameState });
    } else {
      newGameState = states.gameOver({
        ...gameState,
        turnNum: turnNum + 1,
        noughts: newNoughts,
        balances: newBalances,
        onScreenBalances: newBalances,
        result: Result.YouWin,
      });
      pos = positions.victory({ ...newGameState });
    }
  }
  if (gameState.name === states.StateName.OsPickChallengeMove) {
    messageState = {
      walletOutbox: { type: "RESPOND_TO_CHALLENGE", data: pos },
    };
  }
  if (gameState.name === states.StateName.OsPickMove) {
    messageState = sendMessage(pos, opponentAddress, messageState);
  }
  return { gameState: { ...newGameState }, messageState };
}

function xsWaitMoveReducer(
  gameState: states.XsWaitForOpponentToPickMove,
  messageState: MessageState,
  action: actions.PositionReceived | actions.Resign | actions.CreateChallenge
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { return challengeReducer(gameState, messageState); }

  if (
    action.type === actions.POSITION_RECEIVED &&
    (action.position.name === positions.OPLAYING ||
      action.position.name === positions.DRAW ||
      action.position.name === positions.VICTORY)
  ) {
    // should only allow a change in gamestate if we receieve the appropriate position.
    const receivedNoughts = action.position.noughts;
    const { turnNum } = gameState;
    const { crosses, balances, roundBuyIn } = action.position;
    const newBalances: [string, string] = balances;

    let newGameState:
      | states.XsPickMove
      | states.PlayAgain
      | states.GameOver = states.xsPickMove({
      ...gameState,
      turnNum: turnNum + 1,
      noughts: receivedNoughts,
      result: Imperative.Choose,
      balances: newBalances,
    });

    if (!isWinningMarks(receivedNoughts) && !isDraw(receivedNoughts, crosses)) {
      // Not conclusive, keep playing
      // go with default case
      return { gameState: newGameState, messageState };
    }

    if (isWinningMarks(receivedNoughts)) {
      // Lost, if sufficient $ play again?
      if (newBalances[0] >= roundBuyIn && newBalances[1] >= roundBuyIn) {
        newGameState = states.playAgain({
          ...gameState,
          noughts: receivedNoughts,
          balances: newBalances,
          onScreenBalances: newBalances,
          result: Result.YouLose,
          turnNum: gameState.turnNum + 1,
        });
      } else {
        newGameState = states.gameOver({
          ...gameState,
          noughts: receivedNoughts,
          balances: newBalances,
          onScreenBalances: newBalances,
          result: Result.YouLose,
          turnNum: gameState.turnNum + 1,
        });
      }
    }
    return { gameState: newGameState, messageState };
  } else {
    return { gameState, messageState };
  }
}

function osWaitMoveReducer(
  gameState: states.OsWaitForOpponentToPickMove,
  messageState: MessageState,
  action: actions.PositionReceived | actions.Resign | actions.CreateChallenge
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { return challengeReducer(gameState, messageState); }

  if (
    action.type === actions.POSITION_RECEIVED &&
    (action.position.name === positions.XPLAYING ||
      action.position.name === positions.DRAW ||
      action.position.name === positions.VICTORY)
  ) {
    const receivedCrosses = action.position.crosses;
    const { turnNum } = gameState;
    const { noughts, balances, roundBuyIn } = action.position;
    const newBalances: [string, string] = balances;

    let newGameState:
      | states.OsPickMove
      | states.PlayAgain
      | states.GameOver = states.osPickMove({
      ...gameState,
      turnNum: turnNum + 1,
      crosses: receivedCrosses,
      result: Imperative.Choose,
      balances: newBalances,
    });

    if (!isWinningMarks(receivedCrosses) && !isDraw(noughts, receivedCrosses)) {
      // Not conclusive, keep playing
      // go with default case
    }

    if (!isWinningMarks(receivedCrosses) && isDraw(noughts, receivedCrosses)) {
      // Draw, play again?
      newGameState = states.playAgain({
        ...gameState,
        crosses: receivedCrosses,
        result: Result.Tie,
        balances: newBalances,
        onScreenBalances: newBalances,
        turnNum: gameState.turnNum + 1,
      });
    }

    if (isWinningMarks(receivedCrosses)) {
      // Lost, if sufficient $ play again?
      if (newBalances[0] >= roundBuyIn && newBalances[1] >= roundBuyIn) {
        newGameState = states.playAgain({
          ...gameState,
          crosses: receivedCrosses,
          balances: newBalances,
          onScreenBalances: newBalances,
          result: Result.YouLose,
          turnNum: gameState.turnNum + 1,
        });
      } else {
        newGameState = states.gameOver({
          ...gameState,
          crosses: receivedCrosses,
          balances: newBalances,
          onScreenBalances: newBalances,
          result: Result.YouLose,
          turnNum: gameState.turnNum + 1,
        });
      }
    }
    return { gameState: newGameState, messageState };
  } else {
    return { gameState, messageState };
  }
}

export function youWentLast(gameState) {
  if (gameState.you === Marker.noughts) {
    if (popCount(gameState.crosses) === popCount(gameState.noughts)) {
      return true;
    } else {
      return false;
    }
  } else {
    if (popCount(gameState.crosses) > popCount(gameState.noughts)) {
      return true;
    } else {
      return false;
    }
  }
}

function popCount(marks) {
  let i: number;
  let count: number = 0;
  for (i = 0; i < 9; i++) {
    if ((marks >> i) % 2 === 1) {
      count++; // erased a mark
    }
  }
  return count;
}

function playAgainReducer(
  gameState: states.PlayAgain,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { return challengeReducer(gameState, messageState); }
  const opponentAddress = states.getOpponentAddress(gameState);
  let newGameState: states.GameState;
  if (action.type === actions.POSITION_RECEIVED) {
    const position = action.position;
    if (position.name !== (positions.PLAY_AGAIN_ME_FIRST || positions.PLAY_AGAIN_ME_SECOND)) {
      return { gameState, messageState };
    }
    messageState = { ...messageState, actionToRetry: action };
    return { gameState, messageState };
  }
  if (action.type === actions.PLAY_AGAIN && youWentLast(gameState)) {
    newGameState = states.waitToPlayAgain({ ...gameState });
    return { gameState: newGameState, messageState };
  }
  if (action.type === actions.PLAY_AGAIN && !youWentLast(gameState)) {
    const pos = positions.playAgainMeFirst({ ...gameState, turnNum: gameState.turnNum + 1 });
    messageState = sendMessage(pos, opponentAddress, messageState);
    newGameState = states.waitToPlayAgain({ ...gameState, turnNum: gameState.turnNum + 1 });
    return { gameState: newGameState, messageState };
  }
  return { gameState, messageState };
}

function waitToPlayAgainReducer(
  gameState: states.WaitToPlayAgain,
  messageState: MessageState,
  action: actions.GameAction
): JointState {
  const turnNum = gameState.turnNum;
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) { return challengeReducer(gameState, messageState); }
  const opponentAddress = states.getOpponentAddress(gameState);
  let newGameState: states.GameState;
  if (
    action.type === actions.POSITION_RECEIVED &&
    action.position.name === PLAY_AGAIN_ME_FIRST &&
    youWentLast(gameState)
  ) {
       
    newGameState = states.osWaitForOpponentToPickMove({
      ...gameState,
      noughts: 0,
      crosses: 0,
      turnNum: turnNum + 2, // because we recieve and immediately send
      result: Imperative.Wait,
      you: Marker.noughts,
    });
    const pos = positions.playAgainMeSecond({ ...newGameState });
    messageState = sendMessage(pos, opponentAddress, messageState);
    return {
      gameState: newGameState,
      messageState,
    };
  }
  if (
    action.type === actions.POSITION_RECEIVED &&
    action.position.name === PLAY_AGAIN_ME_SECOND &&
    !youWentLast(gameState)
  ) {
    newGameState = states.xsPickMove({
      ...gameState,
      noughts: 0,
      crosses: 0,
      turnNum: turnNum + 1,
      result: Imperative.Choose,
      you: Marker.crosses,
    });
    return { gameState: newGameState, messageState };
  }
  return { gameState: { ...gameState }, messageState };
}

function itsMyTurn(gameState: states.PlayingState) {
  const nextTurnNum = gameState.turnNum + 1;
  return nextTurnNum % 2 === gameState.player;
}

function resignationReducer(
  gameState: states.PlayingState,
  messageState: MessageState
): JointState {
  if (itsMyTurn(gameState)) {
    messageState = {
      ...messageState,
      walletOutbox: { type: "CONCLUDE_REQUESTED" },
    };
  }
  return { gameState, messageState };
}

function gameOverReducer(gameState: states.GameOver, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type !== actions.RESIGN) { return { gameState, messageState }; }

  const newGameState = states.waitForWithdrawal(gameState);
  messageState = { ...messageState, walletOutbox: { type: 'CONCLUDE_REQUESTED' } };

  return { gameState: newGameState, messageState };
}

function waitForWithdrawalReducer(gameState: states.WaitForWithdrawal, messageState: MessageState, action: actions.GameAction) {
  if (action.type !== actions.RESIGN) {
    return { gameState, messageState };
  }
  const { myName, libraryAddress, twitterHandle } = gameState;
  const myAddress = gameState.participants[gameState.player];
  const newGameState = states.lobby({
    myName,
    myAddress,
    libraryAddress,
    twitterHandle,
  });
  return { gameState: newGameState, messageState: {} };
}
