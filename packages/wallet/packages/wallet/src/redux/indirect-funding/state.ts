import * as playerA from './player-a/state';
import * as playerB from './player-b/state';

export { playerA, playerB };

export type IndirectFundingState = playerA.PlayerAState | playerB.PlayerBState;
