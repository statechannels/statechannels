
export const MESSAGE_RECEIVED = 'MESSAGE_SERVICE.MESSAGE_RECEIVED';
export const SEND_MESSAGE = 'MESSAGE_SERVICE.SEND_MESSAGE';
export const SUBSCRIBE_MESSAGES = 'MESSAGE_SERVICE.SUBSCRIBE_MESSAGES';
export const UNSUBSCRIBE_MESSAGES = 'MESSAGE_SERVICE.UNSUBSCRIBE_MESSAGES';
export const MESSAGE_SENT = 'MESSAGE_SERVICE.MESSAGE_SENT';
export const messageSent = ()=>({
  type: MESSAGE_SENT as typeof MESSAGE_SENT,
});
export const sendMessage = (to: string, data: string) => ({
  type: SEND_MESSAGE as typeof SEND_MESSAGE,
  to,
  data,
});

export const messageReceived = (message: string) => ({
  type: MESSAGE_RECEIVED as typeof MESSAGE_RECEIVED,
  message,
});

export const subscribeMessages = (address: string) => ({
  type: SUBSCRIBE_MESSAGES as typeof SUBSCRIBE_MESSAGES,
  address,
});

export const unsubscribeMessages = () => ({
  type: UNSUBSCRIBE_MESSAGES as typeof UNSUBSCRIBE_MESSAGES,
});

export type SendMessage = ReturnType<typeof sendMessage>;
export type MessageReceived = ReturnType<typeof messageReceived>;
export type SubscribeMessages = ReturnType<typeof subscribeMessages>;
export type UnsubscribeMessages = ReturnType<typeof unsubscribeMessages>;
export type MessageSent = ReturnType<typeof messageSent>;

export type MessageAction = SendMessage | MessageReceived | SubscribeMessages | UnsubscribeMessages | MessageSent;

