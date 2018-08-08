import { MessageAction, MessageActionType } from '../actions/messages';

export default function messagesReducer(state = [], action: MessageAction) {
  switch (action.type) {
    case MessageActionType.SYNC_MESSAGES:
      return action.messages;
    default:
      return state
  }
}
