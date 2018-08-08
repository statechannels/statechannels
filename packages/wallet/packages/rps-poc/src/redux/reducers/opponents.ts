import { OpponentActionType, OpponentAction } from '../actions/opponents';

const initialState = [];

export default function reducer (state = initialState, action: OpponentAction) {
  switch (action.type) {
    case OpponentActionType.SYNC:
      return action.opponents;
    default:
      return state
  }
}
