import { ActionsUnion } from './type-helpers';

export enum MessageActionType {
  SUBSCRIBE_MESSAGES = 'SUBSCRIBE_MESSAGES',
  UNSUBSCRIBE_MESSAGES = 'UNSUBSCRIBE_MESSAGES',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  SEND_MESSAGE = 'SEND_MESSAGE',
}

export const MessageAction = {
  sendMessage: (to: string, data: string) => ({
    type: MessageActionType.SEND_MESSAGE as typeof MessageActionType.SEND_MESSAGE,
    to,
    data,
  }),

  messageReceived: (message: any) => ({
    type: MessageActionType.MESSAGE_RECEIVED as typeof MessageActionType.MESSAGE_RECEIVED,
    message,
  }),

  subscribeMessages: (address) => ({
    type: MessageActionType.SUBSCRIBE_MESSAGES as typeof MessageActionType.SUBSCRIBE_MESSAGES,
    address,
  }),

  unsubscribeMessages: () => ({
    type: MessageActionType.UNSUBSCRIBE_MESSAGES as typeof MessageActionType.UNSUBSCRIBE_MESSAGES,
  }),
}

export type MessageAction = ActionsUnion<typeof MessageAction>;
