import { Reducer } from 'redux';
import { OpponentActionType, OpponentAction } from '../actions/opponents';

export interface Opponent {
  address: string,
  name: string,
  lastSeen: number,
}

export type OpponentState = Opponent[];

const initialState = [];

export const opponentReducer: Reducer<OpponentState> = (state = initialState, action: OpponentAction) => {
  switch (action.type) {
    case OpponentActionType.SYNC:
      return action.opponents;
    default:
      return state
  }
}
