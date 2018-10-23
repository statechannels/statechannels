import { Reducer } from 'redux';
import BN from 'bn.js';

import * as actions from './actions';
import * as states from './state';
import { randomHex } from '../../utils/randomHex';
import { calculateResult, balancesAfterResult, calculateAbsoluteResult, Player, positions } from '../../core';
import { MessageState, sendMessage } from '../message-service/state';

export interface JointState {
  gameState: states.GameState;
  messageState: MessageState;
}

// todo: allow an empty name, redirect to choose name page if empty
const emptyJointState: JointState = { messageState: {}, gameState: states.lobby({ myName: 'Me' }) };

export const gameReducer: Reducer<JointState> = (state = emptyJointState, action: actions.GameAction) => {

  if (action.type === actions.MESSAGE_SENT) {
    const { messageState, gameState } = state;
    const { actionToRetry } = messageState;
    return { gameState, messageState: { actionToRetry } };
  }
  // apply the current action to the state
  state = singleActionReducer(state, action);
  // if we have saved an action previously, see if that will apply now
  state = attemptRetry(state);
  return state;
};

function attemptRetry(state: JointState): JointState {
  let { messageState } = state;

  const actionToRetry = messageState.actionToRetry;
  if (actionToRetry) {
    messageState = { ...messageState, actionToRetry: undefined };
    state = singleActionReducer(state, actionToRetry);
  }
  return state;
}

function singleActionReducer(state: JointState, action: actions.GameAction) {
  const { messageState, gameState } = state;

  switch (gameState.name) {
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
    // case states.StateName.OpponentResigned:
    //   return opponentResignedReducer(gameState, messageState, action);
    case states.StateName.WaitForResignationAcknowledgement:
      return waitForResignationAcknowledgementReducer(gameState, messageState, action);
    case states.StateName.GameOver:
      return gameOverReducer(gameState, messageState, action);
    // case states.StateName.WaitForWithdrawal:
    //   return waitForWithdrawalReducer(gameState, messageState, action);
    default:
      throw new Error("Unreachable code");
  }
}

function lobbyReducer(gameState: states.Lobby, messageState: MessageState, action: actions.GameAction): JointState {
  switch (action.type) {
    case actions.NEW_OPEN_GAME:
      const newGameState = states.creatingOpenGame(gameState);
      return { gameState: newGameState, messageState };
    case actions.JOIN_OPEN_GAME:
      const { roundBuyIn, myAddress, opponentAddress } = action;
      const balances: [BN, BN] = [(new BN(roundBuyIn)).muln(5), (new BN(roundBuyIn)).muln(5)];
      const participants: [string, string] = [myAddress, opponentAddress];
      const turnNum = 0;
      const stateCount = 1;

      const waitForConfirmationState = states.waitForGameConfirmationA({
        ...action, balances, participants, turnNum, stateCount,
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
      const newGameState = states.waitingRoom({...gameState, roundBuyIn: action.roundBuyIn });
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
      const { position, myName, opponentName } = action;
      if (position.name !== positions.PRE_FUND_SETUP_A) { return { gameState, messageState }; }

      const newGameState = states.confirmGameB({ ...position, myName, opponentName });
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
  const newGameState = states.waitForFunding({...gameState, turnNum:gameState.turnNum+1});

  return { messageState, gameState: newGameState };
}

function confirmGameBReducer(gameState: states.ConfirmGameB, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.CONFIRM_GAME) { return { gameState, messageState }; }

  const { turnNum } = gameState;

  const newGameState = states.waitForFunding({ ...gameState, turnNum: turnNum + 1 });
  const newPosition = positions.preFundSetupB(newGameState);

  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(newPosition, opponentAddress, messageState);
  messageState = { ...messageState, walletOutbox: 'FUNDING_REQUESTED' };

  return { gameState: newGameState, messageState };
}

function waitForFundingReducer(gameState: states.WaitForFunding, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type === actions.RESIGN) { return resignationReducer(gameState, messageState); }
  if (receivedConclude(action)) { return opponentResignationReducer(gameState, messageState, action); }

  if (action.type !== actions.FUNDING_SUCCESS) { return { gameState, messageState }; }
    const turnNum = gameState.player === Player.PlayerA ? gameState.turnNum+1:gameState.turnNum+2;
    const newGameState = states.waitForPostFundSetup({ ...gameState, turnNum, stateCount: 0 });

    if (gameState.player === Player.PlayerA){
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

function insufficientFunds(balances: [BN, BN], roundBuyIn: BN): boolean {
  return balances[0].lt(roundBuyIn) || balances[1].lt(roundBuyIn);
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
  const newBalances = balancesAfterResult(absoluteResult, roundBuyIn, balances);

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
  const newBalances: [BN, BN] = [balances[0].sub(roundBuyIn), balances[1].add(roundBuyIn)];

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

// function opponentResignedReducer(gameState: states.OpponentResigned, messageState: MessageState, action: actions.GameAction) {
// }

function waitForResignationAcknowledgementReducer(gameState: states.WaitForResignationAcknowledgement, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type !== actions.POSITION_RECEIVED) { return { gameState, messageState }; }
  if (action.position.name !== positions.CONCLUDE) { return { gameState, messageState }; }

  const newGameState = states.gameOver({ ...gameState });
  return { gameState: newGameState, messageState };
}

function gameOverReducer(gameState: states.GameOver, messageState: MessageState, action: actions.GameAction): JointState {
  if (action.type !== actions.WITHDRAWAL_REQUEST) { return { gameState, messageState }; }

  const newGameState = states.waitForWithdrawal(gameState);
  messageState = { ...messageState, walletOutbox: 'WITHDRAWAL' };

  return { gameState: newGameState, messageState };
}
// function waitForWithdrawalReducer(gameState: states.WaitForWithdrawal, messageState: MessageState, action: actions.GameAction) {
// }
