import { ActionsUnion } from './type-helpers';
import { Opponent } from '../reducers/opponents';

export enum OpponentActionType {
  SYNC = 'OPPONENTS.SYNC',
  SUBSCRIBE = 'OPPONENTS.SUBSCRIBE',
  UNSUBSCRIBE = 'OPPONENTS.UNSUBSCRIBE',
};

export const OpponentAction = {
  syncOpponents: (opponents: Opponent[]) => ({
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
