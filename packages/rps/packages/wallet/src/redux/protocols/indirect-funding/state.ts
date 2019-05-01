import { PlayerAState } from './player-a/state';
import { PlayerBState } from './player-b/state';

export * from './player-a/state';
export * from './player-b/state';

export type NonTerminalIndirectFundingState = PlayerAState | PlayerBState;
export type IndirectFundingState = NonTerminalIndirectFundingState | Success | Failure;

export interface Success {
  type: 'Success';
}

export interface Failure {
  type: 'Failure';
}

export function success(): Success {
  return { type: 'Success' };
}

export function failure(): Failure {
  return { type: 'Failure' };
}
