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

  messageReceived: (message: string) => ({
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

export type SendMessageAction = ReturnType<typeof MessageAction.sendMessage>;
export type MessageReceivedAction = ReturnType<typeof MessageAction.messageReceived>;
export type SubscribeMessagesAction = ReturnType<typeof MessageAction.subscribeMessages>;
export type UnsubscribeMessagesAction = ReturnType<typeof MessageAction.unsubscribeMessages>;

export type MessageAction = SendMessageAction | MessageReceivedAction | SubscribeMessagesAction | UnsubscribeMessagesAction;

