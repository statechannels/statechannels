import { PlayerAState as A } from './PlayerA';
import { PlayerBState as B } from './PlayerB';

export type PlayerAState = A;
export type PlayerBState = B;

export type State = PlayerAState | PlayerBState;

export enum Player {
  PlayerA,
  PlayerB,
};
