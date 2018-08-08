import { Reducer } from 'redux';
import { MessageAction, MessageActionType } from '../actions/messages';
import Message from '../../game-engine/Message';

export interface MessageState {
  messages: Message[];
}

const initialState = {
  messages: []
}

export const messagesReducer: Reducer<MessageState> = (state = initialState, action: MessageAction) => {
  switch (action.type) {
    case MessageActionType.SYNC_MESSAGES:
      return { messages: action.messages };
    default:
      return state
  }
}