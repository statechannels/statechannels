import { Opponent } from '../reducers/opponents';

export enum OpponentActionType {
  CREATE_CHALLENGE = 'OPPONENTS.CREATE_CHALLENGE',
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

  createChallenge: (challenge: any) => ({
    type: OpponentActionType.CREATE_CHALLENGE as typeof OpponentActionType.CREATE_CHALLENGE,
    challenge,
  }),
}

export type SyncOpponentsAction = ReturnType<typeof OpponentAction.syncOpponents>;
export type SubscribeOpponentsAction = ReturnType<typeof OpponentAction.subscribeOpponents>;
export type UnsubscribeOpponentsAction = ReturnType<typeof OpponentAction.unsubscribeOpponents>;
export type CreateChallenge = ReturnType<typeof OpponentAction.createChallenge>;

export type OpponentAction = SyncOpponentsAction | SubscribeOpponentsAction | UnsubscribeOpponentsAction | CreateChallenge;

