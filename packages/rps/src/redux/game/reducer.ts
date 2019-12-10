import {GameState, LocalState, Setup, EndGame, A, B, isPlayerB, isPlayerA} from './state';
import {Reducer, combineReducers} from 'redux';
import {GameAction, UpdateChannelState} from './actions';
import {ChannelState} from '../../core';

const emptyLocalState: LocalState = {type: 'Setup.Empty'};

const channelReducer: Reducer<ChannelState | null, UpdateChannelState> = (
  state: ChannelState | null = null,
  action
) => {
  if (action.type === 'UpdateChannelState') {
    return action.channelState;
  } else {
    return state;
  }
};

const localReducer: Reducer<LocalState> = (
  state: LocalState = emptyLocalState,
  action: GameAction
) => {
  let newState = state;
  if (
    action.type === 'Resign' &&
    state.type !== 'Setup.Empty' &&
    state.type !== 'Setup.NeedAddress' &&
    state.type !== 'Setup.Lobby' &&
    state.type !== 'B.CreatingOpenGame' &&
    state.type !== 'B.WaitingRoom' &&
    state.type !== 'A.Resigned' &&
    state.type !== 'B.Resigned' &&
    state.type !== 'EndGame.GameOver'
  ) {
    if (isPlayerA(state)) {
      newState = A.resigned({...state, ...action});
    }
    if (isPlayerB(state)) {
      newState = B.resigned({...state, ...action});
    }
  }
  switch (state.type) {
    case 'Setup.Empty':
      if (action.type === 'UpdateProfile') {
        newState = Setup.needAddress({...state, ...action});
      }
      break;
    case 'Setup.NeedAddress':
      if (action.type === 'GotAddressFromWallet') {
        newState = Setup.lobby({
          ...state,
          ...action,
        });
      }
      break;
    case 'Setup.Lobby':
      if (action.type === 'NewOpenGame') {
        newState = B.creatingOpenGame({...state, ...action});
      }
      if (action.type === 'JoinOpenGame') {
        newState = A.gameChosen({...state, ...action});
      }
      break;
    case 'A.GameChosen':
    case 'A.WaitForRestart':
      if (action.type === 'StartRound') {
        newState = A.chooseWeapon({...state, ...action});
      }
      break;
    case 'A.ChooseWeapon':
      if (action.type === 'ChooseWeapon') {
        newState = A.weaponChosen({...state, ...action});
      }
      break;
    case 'A.WeaponChosen':
      if (action.type === 'ChooseSalt') {
        newState = A.weaponAndSaltChosen({...state, ...action});
      }
      break;
    case 'A.WeaponAndSaltChosen':
      if (action.type === 'ResultArrived') {
        if (action.fundingSituation === 'Ok') {
          newState = A.resultPlayAgain({...state, ...action});
        } else {
          newState = A.insufficientFunds({...state, ...action});
        }
      }
      break;
    case 'A.ResultPlayAgain':
      if (action.type === 'PlayAgain') {
        newState = A.waitForRestart({...state, ...action});
      }
      break;
    case 'B.CreatingOpenGame':
      if (action.type === 'CreateGame') {
        newState = B.waitingRoom({...state, ...action});
      }
      break;
    case 'B.WaitingRoom':
      if (action.type === 'GameJoined') {
        newState = B.opponentJoined({...state, ...action});
      }
      if (action.type === 'CancelGame') {
        newState = Setup.lobby({...state, ...action});
      }
      break;
    case 'B.ResultPlayAgain':
      if (action.type === 'PlayAgain') {
        newState = B.waitForRestart({...state, ...action});
      }
      break;
    case 'B.WaitForRestart':
    case 'B.OpponentJoined':
      if (action.type === 'StartRound') {
        newState = B.chooseWeapon({...state, ...action});
      }
      break;
    case 'B.ChooseWeapon':
      if (action.type === 'ChooseWeapon') {
        newState = B.weaponChosen({...state, ...action});
      }
      break;
    case 'B.WeaponChosen':
      if (action.type === 'ResultArrived') {
        if (action.fundingSituation === 'Ok') {
          newState = B.resultPlayAgain({...state, ...action});
        } else {
          newState = B.insufficientFunds({...state, ...action});
        }
      }
      break;
    case 'A.Resigned':
    case 'B.Resigned':
    case 'A.InsufficientFunds':
    case 'B.InsufficientFunds':
      if (action.type === 'GameOver') {
        newState = EndGame.gameOver({...state, ...action});
      }
      break;
    case 'EndGame.GameOver':
      if (action.type === 'ExitToLobby') {
        newState = Setup.lobby({...state, ...action});
      }
      break;
  }
  return newState;
};

export const gameReducer: Reducer<GameState> = combineReducers({
  localState: localReducer,
  channelState: channelReducer,
});
