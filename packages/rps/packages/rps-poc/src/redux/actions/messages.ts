import { ActionsUnion } from './type-helpers';

import Message from '../../game-engine/Message';

export enum MessageActionType {
  SYNC_MESSAGES = 'SYNC_MESSAGES',
  SUBSCRIBE_MESSAGES = 'SUBSCRIBE_MESSAGES',
  UNSUBSCRIBE_MESSAGES = 'UNSUBSCRIBE_MESSAGES',
}

export const MessageAction = {
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
