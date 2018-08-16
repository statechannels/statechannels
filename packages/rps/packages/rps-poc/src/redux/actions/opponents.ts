import { Opponent } from '../reducers/opponents';

export enum OpponentActionType {
  SYNC = 'OPPONENTS.SYNC',
  SUBSCRIBE = 'OPPONENTS.SUBSCRIBE',
  UNSUBSCRIBE = 'OPPONENTS.UNSUBSCRIBE',
};

export const OpponentAction = {
  syncOpponents: (opponents: Opponent[]) => ({
    type: OpponentActionType.SYNC as typeof OpponentActionType.SYNC,
    opponents,
  }),

  subscribeOpponents: () => ({
    type: OpponentActionType.SUBSCRIBE as typeof OpponentActionType.SUBSCRIBE,
  }),

  unsubscribeOpponents: () => ({
    type: OpponentActionType.UNSUBSCRIBE as typeof OpponentActionType.UNSUBSCRIBE,
  }),
}

export type SyncOpponentsAction = ReturnType<typeof OpponentAction.syncOpponents>;
export type SubscribeOpponentsAction = ReturnType<typeof OpponentAction.subscribeOpponents>;
export type UnsubscribeOpponentsAction = ReturnType<typeof OpponentAction.unsubscribeOpponents>;

export type OpponentAction = SyncOpponentsAction | SubscribeOpponentsAction | UnsubscribeOpponentsAction;

