import { PlayerAState as A, Concluded as ConcludedA } from './PlayerA';
import { PlayerBState as B, Concluded as ConcludedB } from './PlayerB';

export type PlayerAState = A;
export type PlayerBState = B;

export type State = PlayerAState | PlayerBState;

export type Concluded = ConcludedA | ConcludedB ;

export enum Player {
  PlayerA,
  PlayerB,
}
