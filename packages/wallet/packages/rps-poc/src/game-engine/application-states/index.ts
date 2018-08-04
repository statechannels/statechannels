import { PlayerAState } from './PlayerA';
import { PlayerBState } from './PlayerB';

export type State = PlayerAState | PlayerBState;

export enum Player {
  PlayerA,
  PlayerB,
};
