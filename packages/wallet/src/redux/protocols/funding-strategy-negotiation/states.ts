import { FundingStrategyNegotiationState as PlayerAState } from './player-a/states';
import { FundingStrategyNegotiationState as PlayerBState } from './player-b/states';

import * as playerA from './player-a/states';
import * as playerB from './player-b/states';
import { ProtocolState } from '..';

// -------
// Unions and Guards
// -------

export type FundingStrategyNegotiationState = PlayerAState | PlayerBState;
export type OngoingFundingStrategyNegotiationState =
  | playerA.OngoingFundingStrategyNegotiationState
  | playerB.OngoingFundingStrategyNegotiationState;
export type TerminalFundingStrategyNegotiationState =
  | playerA.TerminalFundingStrategyNegotiationState
  | playerB.TerminalFundingStrategyNegotiationState;
export type FundingStrategyNegotiationStateType = FundingStrategyNegotiationState['type'];

export { playerA, playerB };

export function isFundingStrategyNegotiationState(
  state: ProtocolState,
): state is FundingStrategyNegotiationState {
  return (
    playerA.isFundingStrategyNegotiationState(state) ||
    playerB.isFundingStrategyNegotiationState(state)
  );
}

export function isTerminal(
  state: FundingStrategyNegotiationState,
): state is TerminalFundingStrategyNegotiationState {
  return isSuccess(state) || isFailure(state);
}

export function isSuccess(
  state: FundingStrategyNegotiationState,
): state is playerA.Success | playerB.Success {
  return (
    state.type === 'FundingStrategyNegotiation.PlayerA.Success' ||
    state.type === 'FundingStrategyNegotiation.PlayerB.Success'
  );
}
export function isFailure(
  state: FundingStrategyNegotiationState,
): state is playerA.Failure | playerB.Failure {
  return (
    state.type === 'FundingStrategyNegotiation.PlayerA.Failure' ||
    state.type === 'FundingStrategyNegotiation.PlayerB.Failure'
  );
}

export function isNonTerminalFundingState(
  state: FundingStrategyNegotiationState,
): state is OngoingFundingStrategyNegotiationState {
  return isFundingStrategyNegotiationState(state) && !isTerminal(state);
}
