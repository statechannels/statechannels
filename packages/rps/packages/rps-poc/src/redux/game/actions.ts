import { Play } from '../../game-engine/positions';
import Move from '../../game-engine/Move';
import { State } from '../../game-engine/application-states';

export const CHOOSE_PLAY = 'GAME.CHOOSE_PLAY';
export const MOVE_RECEIVED = 'GAME.MOVE_RECEIVED';
export const MOVE_SENT = 'GAME.MOVE_SENT';
export const STATE_CHANGED = 'GAME.STATE_CHANGED';
export const PLAY_COMPUTER = 'GAME.PLAY_COMPUTER';

export const playComputer = (stake: number) => ({
  type: PLAY_COMPUTER as typeof PLAY_COMPUTER,
  stake,
});

export const choosePlay = (play: Play) => ({
  type: CHOOSE_PLAY as typeof CHOOSE_PLAY,
  play,
});

export const moveReceived = (move: Move) => ({
  type: MOVE_RECEIVED as typeof MOVE_RECEIVED,
  move,
});

export const stateChanged = (state: State) => ({
  type: STATE_CHANGED as typeof STATE_CHANGED,
  state,
});

export type ChoosePlay = ReturnType<typeof choosePlay>;
export type MoveReceived = ReturnType<typeof moveReceived>;
export type StateChanged = ReturnType<typeof stateChanged>;
export type PlayComputer = ReturnType<typeof playComputer>;
export type AnyAction =
  | ChoosePlay
  | MoveReceived
  | StateChanged
  | PlayComputer;
