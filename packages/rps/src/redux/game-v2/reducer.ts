import {
  GameChosen,
  WeaponChosen,
  weaponChosen,
  weaponAndSaltChosen,
  resultPlayAgain,
  LocalState,
  waitForRestart,
  chooseWeapon,
  shuttingDown,
} from './state';
import {Reducer, combineReducers} from 'redux';
import {
  GameAction,
  JoinOpenGame,
  ChooseWeapon,
  ChooseSalt,
  ResultArrived,
  PlayAgain,
  Restart,
  Resign,
} from './actions';
import {ChannelState} from '../../core';

const emptyLocalState: LocalState = {type: 'Empty'};

const channelReducer: Reducer<ChannelState | null> = (
  state: ChannelState | null = null,
  action: GameAction
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
  switch (action.type) {
    case 'JoinOpenGame':
      return handleJoinOpenGame(state, action);
    case 'ChooseWeapon':
      return handleChooseWeapon(state, action);
    case 'ChooseSalt':
      return handleChooseSalt(state, action);
    case 'ResultArrived':
      return handleResultArrived(state, action);
    case 'PlayAgain':
      return handlePlayAgain(state, action);
    case 'Restart':
      return handleRestart(state, action);
    case 'Resign':
      return handleResign(state, action);
    default:
      return state;
  }
};

export const gameReducer = combineReducers({
  localState: localReducer,
  channelState: channelReducer,
});

const handleJoinOpenGame = (state: LocalState, action: JoinOpenGame): LocalState => {
  if (state.type === 'Empty') {
    return state;
  }

  const {opponentName, opponentAddress, roundBuyIn} = action;
  const {name, address} = state;

  const newState: GameChosen = {
    type: 'GameChosen',
    player: 'A',
    name,
    address,
    opponentName,
    opponentAddress,
    roundBuyIn,
  };

  return newState;
};

const handleChooseWeapon = (state: LocalState, action: ChooseWeapon): LocalState => {
  if (state.type !== 'ChooseWeapon') {
    return state;
  }

  const {weapon} = action;
  return weaponChosen(state, weapon);
};

const handleChooseSalt = (state: LocalState, action: ChooseSalt): LocalState => {
  if (state.type !== 'WeaponChosen' || state.player !== 'A') {
    return state;
  }
  // not sure why typsecript can't see that player === 'A' here ...
  const oldLocalState = state as (WeaponChosen & {player: 'A'});

  const {salt} = action;
  return weaponAndSaltChosen(oldLocalState, salt);
};

const handleResultArrived = (state: LocalState, action: ResultArrived): LocalState => {
  if (state.type !== 'WeaponChosen' && state.type !== 'WeaponAndSaltChosen') {
    return state;
  }
  const {theirWeapon, result, fundingSituation} = action;
  switch (fundingSituation) {
    case 'Ok':
      return resultPlayAgain(state, theirWeapon, result);
    case 'MyFundsTooLow':
      return shuttingDown(state, 'InsufficientFundsYou');
    case 'OpponentsFundsTooLow':
      return shuttingDown(state, 'InsufficientFundsOpponent');
    default:
      return state;
  }
};

const handlePlayAgain = (state: LocalState, action: PlayAgain): LocalState => {
  if (state.type !== 'ResultPlayAgain') {
    return state;
  }
  return waitForRestart(state);
};

const handleRestart = (state: LocalState, action: Restart): LocalState => {
  if (state.type !== 'WaitForRestart') {
    return state;
  }

  return chooseWeapon(state);
};

const handleResign = (state: LocalState, action: Resign): LocalState => {
  if (state.type === 'Empty' || state.type === 'Lobby' || state.type === 'WaitingRoom') {
    return state;
  }

  return shuttingDown(state, 'YouResigned');
};
