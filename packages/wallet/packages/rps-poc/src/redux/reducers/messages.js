import { types } from '../actions/messages';

export default function messagesReducer (state = [], action) {
  switch (action.type) {
    case types.SYNC_MESSAGES:
      return action.messages;
    default:
      return state
  }
}