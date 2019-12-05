import {LocalState} from './state';
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
    state.type !== 'B.WaitingRoom' &&
    state.type !== 'B.CreatingOpenGame'
  ) {
    newState = resigned(state, action.iResigned);
  }
  switch (state.type) {
    case 'Setup.Empty':
      if (action.type === 'UpdateProfile') {
        newState = needAddress({...state, ...action});
      }
      break;
    case 'Setup.NeedAddress':
      if (action.type === 'GotAddressFromWallet') {
        newState = lobby({
          ...state,
          ...action,
        });
      }
      break;
    case 'Setup.Lobby':
      if (action.type === 'NewOpenGame') {
        newState = creatingOpenGame(state);
      }
      if (action.type === 'JoinOpenGame') {
        const {opponentName, opponentAddress, roundBuyIn} = action;
        const {name, address} = state;
        newState = gameChosen({name, address, opponentName, roundBuyIn}, opponentAddress);
      }
      break;
    case 'B.CreatingOpenGame':
      if (action.type === 'CreateGame') {
        newState = waitingRoom({...state, ...action});
      }
      break;
    case 'A.ResultPlayAgain':
    case 'B.ResultPlayAgain':
      if (action.type === 'PlayAgain') {
        newState = waitForRestart(state, state.theirWeapon, state.result);
      }
      break;
    case 'B.WaitingRoom':
      if (action.type === 'GameJoined') {
        newState = opponentJoined({...state, ...action});
      }
      break;
    case 'B.OpponentJoined':
    case 'A.GameChosen':
    case 'A.WaitForRestart':
      if (action.type === 'StartRound') {
        newState = chooseWeapon(state);
      }
      break;
    case 'A.ChooseWeapon':
    case 'B.ChooseWeapon':
      if (action.type === 'ChooseWeapon') {
        newState = weaponChosen(state, action.weapon);
      }
      break;
    case 'A.WeaponChosen':
    case 'A.WeaponAndSaltChosen':
    case 'B.WeaponChosen':
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
    case 'EndGame.Resigned':
    case 'EndGame.InsufficientFunds':
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
