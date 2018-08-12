import { ActionsUnion } from './type-helpers';

import Message from '../../game-engine/Message';

export enum MessageActionType {
  SYNC_MESSAGES = 'SYNC_MESSAGES',
  SUBSCRIBE_MESSAGES = 'SUBSCRIBE_MESSAGES',
  UNSUBSCRIBE_MESSAGES = 'UNSUBSCRIBE_MESSAGES',
  MESSAGE_ROUTED = 'MESSAGE_ROUTED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
}

export const MessageAction = {
  messageRouted: (channelId: string, message: Message) => ({
    type: MessageActionType.MESSAGE_ROUTED as typeof MessageActionType.MESSAGE_ROUTED,
    channelId,
    message,
  }),

  messageReceived: (message: Message) => ({
    type: MessageActionType.MESSAGE_RECEIVED as typeof MessageActionType.MESSAGE_RECEIVED,
    message,
  }),

  syncMessages: (messages: Message[]) => ({
    type: MessageActionType.SYNC_MESSAGES as typeof MessageActionType.SYNC_MESSAGES,
    messages,
  }),

  subscribeMessages: () => ({
    type: MessageActionType.SUBSCRIBE_MESSAGES as typeof MessageActionType.SUBSCRIBE_MESSAGES,
  }),

  unsubscribeMessages: () => ({
    type: MessageActionType.UNSUBSCRIBE_MESSAGES as typeof MessageActionType.UNSUBSCRIBE_MESSAGES,
  }),
}

export type MessageAction = ActionsUnion<typeof MessageAction>;
