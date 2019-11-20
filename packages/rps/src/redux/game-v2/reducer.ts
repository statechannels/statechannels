import {
  GameState,
  GameChosen,
  WeaponChosen,
  weaponChosen,
  weaponAndSaltChosen,
  resultPlayAgain,
} from './state';
import { Reducer } from 'redux';
import {
  GameAction,
  JoinOpenGame,
  ChooseWeapon,
  UpdateChannelState,
  ChooseSalt,
  ResultArrived,
} from './actions';

const emptyGameState = {
  localState: { type: 'Empty' },
} as GameState;

export const gameReducer: Reducer<GameState> = (
  state: GameState = emptyGameState,
  action: GameAction
) => {
  switch (action.type) {
    case 'UpdateChannelState':
      return handleUpdateChannelState(state, action);
    case 'JoinOpenGame':
      return handleJoinOpenGame(state, action);
    case 'ChooseWeapon':
      return handleChooseWeapon(state, action);
    case 'ChooseSalt':
      return handleChooseSalt(state, action);
    case 'ResultArrived':
      return handleResultArrived(state, action);
    default:
      return state;
  }
};

const handleUpdateChannelState = (state: GameState, action: UpdateChannelState): GameState => {
  const { channelState } = action;
  return { ...state, channelState };
};

const handleJoinOpenGame = (state: GameState, action: JoinOpenGame): GameState => {
  if (state.localState.type === 'Empty') {
    return state;
  }

  const { opponentName, opponentAddress, roundBuyIn } = action;
  const { name, address } = state.localState;

  const localState: GameChosen = {
    type: 'GameChosen',
    player: 'A',
    name,
    address,
    opponentName,
    opponentAddress,
    roundBuyIn,
  };

  return { ...state, localState };
};

const handleChooseWeapon = (state: GameState, action: ChooseWeapon): GameState => {
  if (state.localState.type !== 'ChooseWeapon') {
    return state;
  }

  const { weapon } = action;
  const localState = weaponChosen(state.localState, weapon);

  return { ...state, localState };
};

const handleChooseSalt = (state: GameState, action: ChooseSalt): GameState => {
  if (state.localState.type !== 'WeaponChosen' || state.localState.player !== 'A') {
    return state;
  }
  // not sure why typsecript can't see that player === 'A' here ...
  const oldLocalState = state.localState as (WeaponChosen & { player: 'A' });

  const { salt } = action;
  const localState = weaponAndSaltChosen(oldLocalState, salt);

  return { ...state, localState };
};

const handleResultArrived = (state: GameState, action: ResultArrived): GameState => {
  if (state.localState.type !== 'WeaponChosen' && state.localState.type !== 'WeaponAndSaltChosen') {
    return state;
  }
  const { theirWeapon, result } = action;
  const localState = resultPlayAgain(state.localState, theirWeapon, result);

  return { ...state, localState };
};
