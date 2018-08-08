import { Reducer } from 'redux';
import { OpponentActionType, OpponentAction } from '../actions/opponents';

export interface OpponentState {
  opponents: string[];
}
const initialState = {opponents: []};

export const opponentReducer: Reducer<OpponentState> = (state = initialState, action: OpponentAction) => {
  switch (action.type) {
    case OpponentActionType.SYNC:
      return { opponents: action.opponents };
    default:
      return state
  }
}
