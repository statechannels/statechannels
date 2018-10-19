import { Play } from '../../game-engine/positions';
import { State } from '../../game-engine/application-states';

export const CHOOSE_PLAY = 'GAME.CHOOSE_PLAY';
export const PLAY_AGAIN = 'GAME.PLAY_AGAIN';
export const ABANDON_GAME = 'GAME.ABANDON_GAME';
export const STATE_CHANGED = 'GAME.STATE_CHANGED';

export const choosePlay = (play: Play) => ({
  type: CHOOSE_PLAY as typeof CHOOSE_PLAY,
  play,
});

export const playAgain = () => ({
  type: PLAY_AGAIN as typeof PLAY_AGAIN,
});

export const abandonGame = () => ({
  type: ABANDON_GAME as typeof ABANDON_GAME,
});

export const stateChanged = (state: State) => ({
  type: STATE_CHANGED as typeof STATE_CHANGED,
  state,
});

export type ChoosePlay = ReturnType<typeof choosePlay>;
export type PlayAgain = ReturnType<typeof playAgain>;
export type AbandonGame = ReturnType<typeof abandonGame>;
export type StateChanged = ReturnType<typeof stateChanged>;
export type AnyAction =
  | ChoosePlay
  | PlayAgain
  | AbandonGame
  | StateChanged;
