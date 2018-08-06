import Message from '../../game-engine/Message';

export enum MessageTypes {
  SYNC_MESSAGES,
  SUBSCRIBE_MESSAGES,
}

export const syncMessages = (messages: Message[]) => ({
  type: types.SYNC_MESSAGES,
  messages,
});

export const subscribeMessages = () => ({
  types: types.SUBSCRIBE_MESSAGES,
});
