import { MessageTypes } from '../actions/messages';

export default function messagesReducer (state = [], action = {}) {
  switch (action.type) {
    case MessageTypes.SYNC_MESSAGES:
      return action.messages;
    default:
      return state
  }
}