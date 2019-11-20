import { GameState, GameChosen } from './state';
import { Reducer } from 'redux';
import { GameAction } from './actions';

const emptyGameState = {
  localState: { type: 'Empty' },
} as GameState;

export const gameReducer: Reducer<GameState> = (
  state: GameState = emptyGameState,
  action: GameAction
) => {
  switch (action.type) {
    case 'JoinOpenGame':
      if (state.localState.type === 'Empty') {
        return state;
      }

      const { opponentName, opponentAddress, roundBuyIn } = action;
      const { name, address } = state.localState;

      const localState = {
        type: 'GameChosen',
        player: 'A',
        name,
        address,
        opponentName,
        opponentAddress,
        roundBuyIn,
      } as GameChosen;

      return { ...state, localState };
    case 'UpdateChannelState':
      const { channelState } = action;
      return { ...state, channelState };
    default:
      return state;
  }
};
