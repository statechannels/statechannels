import { Reducer } from 'redux';
import BN from 'bn.js';

import * as actions from './actions';
import * as states from './state';
import { randomHex } from '../../utils/randomHex';
import { calculateResult, balancesAfterResult, calculateAbsoluteResult, Player, positions } from '../../core';
import { MessageState, sendMessage } from '../message-service/state';
import { LoginSuccess, LOGIN_SUCCESS } from '../login/actions';
import { InitializationSuccess, INITIALIZATION_SUCCESS } from '../../wallet/redux/actions/external';

import hexToBN from '../../utils/hexToBN';
import bnToHex from '../../utils/bnToHex';

export interface JointState {
  gameState: states.GameState;
  messageState: MessageState;
}

const emptyJointState: JointState = { messageState: {}, gameState: states.noName({ myAddress: '', libraryAddress: '' }) };

export const gameReducer: Reducer<JointState> = (state = emptyJointState, action: actions.GameAction | LoginSuccess | InitializationSuccess) => {
  if (action.type === actions.EXIT_TO_LOBBY && state.gameState.name !== states.StateName.NoName) {
    const myAddress  =  ('myAddress' in state.gameState) ? state.gameState.myAddress : "";
    const myName = ('myName' in state.gameState) ? state.gameState.myName: ""; 
    const newGameState = states.lobby({...state.gameState, myAddress, myName});
    return {gameState:newGameState, messageState:{}};
  }
  if (action.type === actions.MESSAGE_SENT) {
    const { messageState, gameState } = state;
    const { actionToRetry } = messageState;
    return { gameState, messageState: { actionToRetry } };
  }
  if (action.type === LOGIN_SUCCESS) {
    const { messageState, gameState } = state;
    const { libraryAddress } = action;
    return { gameState: { ...gameState, libraryAddress }, messageState };
  }
  if (action.type === INITIALIZATION_SUCCESS) {
    const { messageState, gameState } = state;
    const { address: myAddress } = action;
    return { gameState: { ...gameState, myAddress, }, messageState };
  }
  // apply the current action to the state
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
    case states.StateName.WaitForGameConfirmationA:
      return waitForGameConfirmationAReducer(gameState, messageState, action);
    case states.StateName.ConfirmGameB:
      return confirmGameBReducer(gameState, messageState, action);
    case states.StateName.WaitForFunding:
      return waitForFundingReducer(gameState, messageState, action);
    case states.StateName.WaitForPostFundSetup:
      return waitForPostFundSetupReducer(gameState, messageState, action);
    case states.StateName.PickMove:
      return pickMoveReducer(gameState, messageState, action);
    case states.StateName.WaitForOpponentToPickMoveA:
      return waitForOpponentToPickMoveAReducer(gameState, messageState, action);
    case states.StateName.WaitForOpponentToPickMoveB:
      return waitForOpponentToPickMoveBReducer(gameState, messageState, action);
    case states.StateName.WaitForRevealB:
      return waitForRevealBReducer(gameState, messageState, action);
    case states.StateName.PlayAgain:
      return playAgainReducer(gameState, messageState, action);
    case states.StateName.WaitForRestingA:
      return waitForRestingAReducer(gameState, messageState, action);
    case states.StateName.InsufficientFunds:
      return insufficientFundsReducer(gameState, messageState, action);
    case states.StateName.WaitToResign:
      return waitToResignReducer(gameState, messageState, action);
    case states.StateName.WaitForResignationAcknowledgement:
      return waitForResignationAcknowledgementReducer(gameState, messageState, action);
    case states.StateName.GameOver:
      return gameOverReducer(gameState, messageState, action);
    case states.StateName.WaitForWithdrawal:
      return waitForWithdrawalReducer(gameState, messageState, action);
    case states.StateName.OpponentResigned:
      return opponentResignedReducer(gameState, messageState, action);
    default:
      throw new Error("Unreachable code");
  }
}

function noNameReducer(gameState: states.NoName, messageState: MessageState, action: actions.GameAction): JointState {
  switch (action.type) {
    case actions.UPDATE_PROFILE:
      const { name, twitterHandle } = action;
      const { myAddress, libraryAddress } = gameState;

      const lobby = states.lobby({
        ...action, myName: name, myAddress, libraryAddress, twitterHandle,
      });
      return { gameState: lobby, messageState };
    default:
      return { gameState, messageState };
  }
}

function lobbyReducer(gameState: states.Lobby, messageState: MessageState, action: actions.GameAction): JointState {
  switch (action.type) {
    case actions.NEW_OPEN_GAME:
      const newGameState = states.creatingOpenGame({ ...gameState });
      return { gameState: newGameState, messageState };
    case actions.JOIN_OPEN_GAME:
      const { roundBuyIn, opponentAddress } = action;
      const { myName, myAddress, libraryAddress, twitterHandle } = gameState;
      const balances = [hexToBN(roundBuyIn).muln(5), hexToBN(roundBuyIn).muln(5)].map(bnToHex) as [string, string];
      const participants: [string, string] = [myAddress, opponentAddress];
      const turnNum = 0;
      const stateCount = 1;

      const waitForConfirmationState = states.waitForGameConfirmationA({
        ...action, myName, balances, participants, turnNum, stateCount, libraryAddress, twitterHandle,
      });
      messageState = sendMessage(positions.preFundSetupA(waitForConfirmationState), opponentAddress, messageState);
      return { gameState: waitForConfirmationState, messageState };
    default:
      return { gameState, messageState };
  }
}

function creatingOpenGameReducer(gameState: states.CreatingOpenGame, messageState: MessageState, action: actions.GameAction): JointState {
  switch (action.type) {
    case actions.CREATE_OPEN_GAME:
      const newGameState = states.waitingRoom({ ...gameState, roundBuyIn: action.roundBuyIn });
      return { gameState: newGameState, messageState };
    case actions.CANCEL_OPEN_GAME:
      const newGameState1 = states.lobby(gameState);
      return { gameState: newGameState1, messageState };
    default:
      return { gameState, messageState };
  }
}

function waitingRoomReducer(gameState: states.WaitingRoom, messageState: MessageState, action: actions.GameAction): JointState {
  switch (action.type) {
    case actions.INITIAL_POSITION_RECEIVED:
      const { position, opponentName } = action;
      const { myName, twitterHandle } = gameState;

      if (position.name !== positions.PRE_FUND_SETUP_A) { return { gameState, messageState }; }

      const newGameState = states.confirmGameB({ ...position, myName, opponentName, twitterHandle });
      return { gameState: newGameState, messageState };
    case actions.CANCEL_OPEN_GAME:
      const newGameState1 = states.lobby(gameState);
      return { gameState: newGameState1, messageState };
    default:
      return { gameState, messageState };
  }
}

function itsMyTurn(gameState: states.PlayingState) {
  const nextTurnNum = gameState.turnNum + 1;
  return nextTurnNum % 2 === gameState.player;
}

function receivedConclude(action: actions.GameAction) {
  return action.type === actions.POSITION_RECEIVED && action.position.name === positions.CONCLUDE;
}

function resignationReducer(gameState: states.PlayingState, messageState: MessageState): JointState {
  if (itsMyTurn(gameState)) {
    const { turnNum } = gameState;
    // transition to WaitForResignationAcknowledgement
    gameState = states.waitForResignationAcknowledgement({ ...gameState, turnNum: turnNum + 1 });

    // and send the latest state to our opponent
    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(positions.conclude(gameState), opponentAddress, messageState);
  } else {
    // transition to WaitToResign
    gameState = states.waitToResign(gameState);
  }

  return { gameState, messageState };
}

function opponentResignationReducer(gameState: states.PlayingState, messageState: MessageState, action: actions.GameAction) {
  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  const position = action.position;
  if (position.name !== positions.CONCLUDE) { return { gameState, messageState }; }
  // in taking the turnNum from their position, we're trusting the wallet to have caught
  // the case where they resign when it isn't their turn
  const { turnNum } = position;

  // transition to OpponentResigned
  gameState = states.opponentResigned({ ...gameState, turnNum: turnNum + 1 });

  // send Conclude to our opponent
  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(positions.conclude(gameState), opponentAddress, messageState);

  return { gameState, messageState };
}

function waitForGameConfirmationAReducer(gameState: states.WaitForGameConfirmationA, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }
  // only action we need to handle in this state is to receiving a PreFundSetupB
  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }
  if (action.position.name !== positions.PRE_FUND_SETUP_B) { return { gameState, messageState }; }

  // request funding
  messageState = { ...messageState, walletOutbox: 'FUNDING_REQUESTED' };

  // transition to Wait for Funding
  const newGameState = states.waitForFunding({ ...gameState, turnNum: gameState.turnNum + 1 });

  return { messageState, gameState: newGameState };
}

function confirmGameBReducer(gameState: states.ConfirmGameB, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.CONFIRM_GAME && action.type !== actions.DECLINE_GAME) { return { gameState, messageState }; }

  if (action.type === actions.CONFIRM_GAME) {
    const { turnNum } = gameState;

    const newGameState = states.waitForFunding({ ...gameState, turnNum: turnNum + 1 });
    const newPosition = positions.preFundSetupB(newGameState);

    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(newPosition, opponentAddress, messageState);
    messageState = { ...messageState, walletOutbox: 'FUNDING_REQUESTED' };

    return { gameState: newGameState, messageState };
  } else {

    const { myName, participants, libraryAddress, player, twitterHandle } = gameState;
    // TODO: Probably should return to the waiting room instead of getting kicked back to the lobby
    const newGameState = states.lobby({ myName, myAddress: participants[player], libraryAddress, twitterHandle });
    // TODO: Send a message to the other player that the game has been declined
    return { gameState: newGameState, messageState };
  }
}

function waitForFundingReducer(gameState: states.WaitForFunding, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type === actions.POSITION_RECEIVED) {
    const position = action.position;
    if (position.name !== positions.POST_FUND_SETUP_A || gameState.player !== Player.PlayerB) {
      return { gameState, messageState };
    }
    messageState = { ...messageState, actionToRetry: action };

    return { gameState, messageState };
  }

  if (action.type !== actions.FUNDING_SUCCESS) { return { gameState, messageState }; }
  const turnNum = gameState.player === Player.PlayerA ? gameState.turnNum + 1 : gameState.turnNum;
  const newGameState = states.waitForPostFundSetup({ ...gameState, turnNum, stateCount: 0 });

  if (gameState.player === Player.PlayerA) {
    const postFundSetupA = positions.postFundSetupA(newGameState);
    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(postFundSetupA, opponentAddress, messageState);
  }
  return { gameState: newGameState, messageState };

}

function waitForPostFundSetupReducer(gameState: states.WaitForPostFundSetup, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  const { turnNum } = gameState;
  const newGameState = states.pickMove({ ...gameState, turnNum: turnNum + 1 });
  if (gameState.player === Player.PlayerB) {
    newGameState.turnNum += 1;
    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(positions.postFundSetupB(newGameState), opponentAddress, messageState);
  }

  return { gameState: newGameState, messageState };
}

function pickMoveReducer(gameState: states.PickMove, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  const turnNum = gameState.turnNum;

  if (gameState.player === Player.PlayerA) {
    if (action.type !== actions.CHOOSE_MOVE) { return { gameState, messageState }; }
    const salt = randomHex(64);
    const asMove = action.move;

    const propose = positions.proposeFromSalt({ ...gameState, asMove, salt, turnNum: turnNum + 1 });
    const newGameStateA = states.waitForOpponentToPickMoveA({ ...gameState, ...propose, salt, myMove: asMove });

    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(positions.propose(propose), opponentAddress, messageState);

    return { gameState: newGameStateA, messageState };
  } else {
    if (action.type === actions.POSITION_RECEIVED && action.position.name === positions.PROPOSE) {
      messageState = { ...messageState, actionToRetry: action };
      return { gameState, messageState };
    } else if (action.type === actions.CHOOSE_MOVE) {

      const newGameStateB = states.waitForOpponentToPickMoveB({ ...gameState, myMove: action.move });

      return { gameState: newGameStateB, messageState };
    }
  }

  return { gameState, messageState };
}

function insufficientFunds(balances: [string, string], roundBuyIn: string): boolean {
  const aBal = hexToBN(balances[0]);
  const bBal = hexToBN(balances[1]);
  const buyIn = hexToBN(roundBuyIn);

  return aBal.lt(buyIn) || bBal.lt(buyIn);
}

function waitForOpponentToPickMoveAReducer(gameState: states.WaitForOpponentToPickMoveA, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  const { roundBuyIn, myMove, salt } = gameState;
  const { position: theirPosition } = action;

  if (theirPosition.name !== positions.ACCEPT) { return { gameState, messageState }; }

  const { bsMove: theirMove, balances, turnNum } = theirPosition;
  const result = calculateResult(myMove, theirMove);
  const absoluteResult = calculateAbsoluteResult(myMove, theirMove);
  const bnRoundBuyIn = hexToBN(roundBuyIn);
  const bnBalances = balances.map(hexToBN) as [BN, BN];
  const newBalances = balancesAfterResult(absoluteResult, bnRoundBuyIn, bnBalances).map(bnToHex) as [string, string];

  const newProperties = { myMove, theirMove, result, balances: newBalances, turnNum: turnNum + 1 };

  let newGameState;
  if (insufficientFunds(newBalances, roundBuyIn)) {
    newGameState = states.insufficientFunds({ ...gameState, ...newProperties });
  } else {
    newGameState = states.playAgain({ ...gameState, ...newProperties });
  }

  const reveal = positions.reveal({ ...newGameState, asMove: myMove, bsMove: theirMove, salt });
  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(reveal, opponentAddress, messageState);

  return { gameState: newGameState, messageState };
}

function waitForOpponentToPickMoveBReducer(gameState: states.WaitForOpponentToPickMoveB, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  const position = action.position;
  if (position.name !== positions.PROPOSE) { return { gameState, messageState }; }

  const preCommit = position.preCommit;
  const { balances, turnNum, roundBuyIn } = gameState;
  const aBal = bnToHex(hexToBN(balances[0]).sub(hexToBN(roundBuyIn)));
  const bBal = bnToHex(hexToBN(balances[1]).add(hexToBN(roundBuyIn)));
  const newBalances = [aBal, bBal] as [string, string];

  const newGameState = states.waitForRevealB({ ...gameState, balances: newBalances, preCommit, turnNum: turnNum + 2 });

  const newPosition = positions.accept({ ...newGameState, bsMove: newGameState.myMove });

  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(newPosition, opponentAddress, messageState);

  return { gameState: newGameState, messageState };
}

function waitForRevealBReducer(gameState: states.WaitForRevealB, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  if (action.position.name !== positions.REVEAL) { return { gameState, messageState }; }
  const position = action.position;
  const theirMove = position.asMove;
  const balances = position.balances; // wallet will catch if they updated wrong
  const turnNum = position.turnNum;

  const myMove = gameState.myMove;
  const roundBuyIn = gameState.roundBuyIn;

  const result = calculateResult(myMove, theirMove);
  const newProperties = { theirMove, result, balances, turnNum };

  if (insufficientFunds(balances, roundBuyIn)) {
    const newGameState1 = states.insufficientFunds({
      ...gameState,
      ...newProperties,
      turnNum: turnNum + 1,
    });

    const newPosition = positions.conclude(newGameState1);
    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(newPosition, opponentAddress, messageState);

    return { gameState: newGameState1, messageState };
  } else {
    const newGameState2 = states.playAgain({ ...gameState, ...newProperties });

    return { gameState: newGameState2, messageState };
  }
}

function playAgainReducer(gameState: states.PlayAgain, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  switch (action.type) {
    // case actions.RESIGN: // handled globally
    // case actions.OPPONENT_RESIGNED: // handled globally
    case actions.PLAY_AGAIN:
      if (gameState.player === Player.PlayerA) {
        // transition to WaitForResting
        const newGameState = states.waitForRestingA(gameState);

        return { gameState: newGameState, messageState };
      } else {
        // transition to PickMove
        const { turnNum } = gameState;
        const newGameState1 = states.pickMove({ ...gameState, turnNum: turnNum + 1 });

        const resting = positions.resting(newGameState1);

        // send Resting
        const opponentAddress = states.getOpponentAddress(gameState);
        messageState = sendMessage(resting, opponentAddress, messageState);

        return { gameState: newGameState1, messageState };
      }

    case actions.POSITION_RECEIVED:
      const position = action.position;
      if (position.name !== positions.RESTING) { return { gameState, messageState }; }

      messageState = { ...messageState, actionToRetry: action };
      return { gameState, messageState };

    default:
      return { gameState, messageState };

  }

}

function waitForRestingAReducer(gameState: states.WaitForRestingA, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  const position = action.position;
  if (position.name !== positions.RESTING) { return { gameState, messageState }; }

  const { turnNum } = gameState;

  const newGameState = states.pickMove({ ...gameState, turnNum: turnNum + 1 });

  return { gameState: newGameState, messageState };
}

function insufficientFundsReducer(gameState: states.InsufficientFunds, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }

  const position = action.position;
  if (position.name !== positions.CONCLUDE) { return { gameState, messageState }; }

  const { turnNum } = position;

  // transition to gameOver
  const newGameState = states.gameOver({ ...gameState, turnNum });

  if (gameState.player === Player.PlayerA) {
    newGameState.turnNum = newGameState.turnNum + 1;
    // send conclude if player A
    const conclude = positions.conclude(newGameState);

    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(conclude, opponentAddress, messageState);
  }

  return { gameState: newGameState, messageState };
}

function waitToResignReducer(gameState: states.WaitToResign, messageState: MessageState, action: actions.GameAction): JointState {
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }
  const turnNum = action.position.turnNum + 1;

  const newGameState = states.waitForResignationAcknowledgement({ ...gameState, turnNum });

  const newPosition = positions.conclude(newGameState);
  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(newPosition, opponentAddress, messageState);

  return { gameState: newGameState, messageState };
}

function opponentResignedReducer(gameState: states.OpponentResigned, messageState: MessageState, action: actions.GameAction) {
  if (action.type !== actions.WITHDRAWAL_REQUEST) { return { gameState, messageState }; }

  const newGameState = states.waitForWithdrawal(gameState);
  messageState = { ...messageState, walletOutbox: 'WITHDRAWAL_REQUESTED' };

  return { gameState: newGameState, messageState };
}

function waitForResignationAcknowledgementReducer(gameState: states.WaitForResignationAcknowledgement, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }
  if (action.position.name !== positions.CONCLUDE) { return { gameState, messageState }; }

  const newGameState = states.gameOver({ ...gameState, turnNum: gameState.turnNum + 1 });
  return { gameState: newGameState, messageState };
}

function gameOverReducer(gameState: states.GameOver, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type !== actions.WITHDRAWAL_REQUEST) { return { gameState, messageState }; }

  const newGameState = states.waitForWithdrawal(gameState);
  messageState = { ...messageState, walletOutbox: 'WITHDRAWAL_REQUESTED' };

  return { gameState: newGameState, messageState };
}
function waitForWithdrawalReducer(gameState: states.WaitForWithdrawal, messageState: MessageState, action: actions.GameAction) {
  if (action.type !== actions.WITHDRAWAL_SUCCESS) {
    return { gameState, messageState };
  }
  const { myName, libraryAddress, twitterHandle } = gameState;
  const myAddress = gameState.participants[gameState.player];
  const newGameState = states.lobby({ myName, myAddress, libraryAddress, twitterHandle });
  return { gameState: newGameState, messageState: {} };
}  
