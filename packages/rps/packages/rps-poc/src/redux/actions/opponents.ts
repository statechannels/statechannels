import { ActionsUnion } from './type-helpers';

export enum OpponentActionType {
  SYNC = 'OPPONENTS.SYNC',
  SUBSCRIBE = 'OPPONENTS.SUBSCRIBE',
  UNSUBSCRIBE = 'OPPONENTS.UNSUBSCRIBE',
};

export const OpponentAction = {
  syncOpponents: (opponents: any[]) => ({
    type: OpponentActionType.SYNC as typeof OpponentActionType.SYNC,
    opponents
  }),

  subscribeOpponents: () => ({
    type: OpponentActionType.SUBSCRIBE as typeof OpponentActionType.SUBSCRIBE,
  }),

  unsubscribeOpponents: () => ({
    type: OpponentActionType.UNSUBSCRIBE as typeof OpponentActionType.UNSUBSCRIBE,
  }),
}

export type OpponentAction = ActionsUnion<typeof OpponentAction>;
