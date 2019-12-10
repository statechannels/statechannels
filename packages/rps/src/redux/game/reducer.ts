import {
  weaponChosen,
  weaponAndSaltChosen,
  resultPlayAgain,
  LocalState,
  lobby,
  chooseWeapon,
  resigned,
  gameChosen,
  gameOver,
  GameState,
  creatingOpenGame,
  needAddress,
  insufficientFunds,
  waitForRestart,
  waitingRoom,
  opponentJoined,
} from './state';
import {Reducer, combineReducers} from 'redux';
import {GameAction, UpdateChannelState} from './actions';
import {ChannelState} from '../../core';

const emptyLocalState: LocalState = {type: 'Empty'};

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
    state.type !== 'Empty' &&
    state.type !== 'NeedAddress' &&
    state.type !== 'Lobby' &&
    state.type !== 'WaitingRoom' &&
    state.type !== 'CreatingOpenGame'
  ) {
    newState = resigned(state, action.iResigned);
  }
  switch (state.type) {
    case 'Empty':
      if (action.type === 'UpdateProfile') {
        newState = needAddress({...state, ...action});
      }
      break;
    case 'NeedAddress':
      if (action.type === 'GotAddressFromWallet') {
        newState = lobby({
          ...state,
          ...action,
        });
      }
      break;
    case 'Lobby':
      if (action.type === 'NewOpenGame') {
        newState = creatingOpenGame(state);
      }
      if (action.type === 'JoinOpenGame') {
        const {opponentName, opponentAddress, roundBuyIn} = action;
        const {name, address} = state;
        newState = gameChosen({name, address, opponentName, roundBuyIn}, opponentAddress);
      }
      break;
    case 'CreatingOpenGame':
      if (action.type === 'CreateGame') {
        newState = waitingRoom({...state, ...action});
      }
      break;
    case 'ResultPlayAgain':
      if (action.type === 'PlayAgain') {
        newState = waitForRestart(state, state.theirWeapon, state.result);
      }
      break;
    case 'WaitingRoom':
      if (action.type === 'GameJoined') {
        newState = opponentJoined({...state, ...action});
      }
      if (action.type === 'CancelGame') {
        const {name, address} = state;
        newState = lobby({name, address});
      }
      break;
    case 'OpponentJoined':
    case 'GameChosen':
    case 'WaitForRestart':
      if (action.type === 'StartRound') {
        newState = chooseWeapon(state);
      }
      break;
    case 'ChooseWeapon':
      if (action.type === 'ChooseWeapon') {
        newState = weaponChosen(state, action.weapon);
      }
      break;
    case 'WeaponChosen':
    case 'WeaponAndSaltChosen':
      if (state.player === 'A' && action.type === 'ChooseSalt') {
        newState = weaponAndSaltChosen({...state, player: 'A'}, action.salt);
      }
      if (action.type === 'ResultArrived') {
        if (action.fundingSituation === 'Ok') {
          newState = resultPlayAgain(state, action.theirWeapon, action.result);
        } else {
          newState = insufficientFunds(state, action.theirWeapon, action.result);
        }
      }
      break;
    case 'Resigned':
    case 'InsufficientFunds':
      if (action.type === 'GameOver') {
        newState = gameOver(state);
      }
      break;
  }
  return newState;
};

export const gameReducer: Reducer<GameState> = combineReducers({
  localState: localReducer,
  channelState: channelReducer,
});
