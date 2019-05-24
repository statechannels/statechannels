import {
  ResponderState,
  TerminalResponderState,
  isTerminal as isResponderTerminal,
  isResponderState,
  NonTerminalResponderState,
} from './responder/states';
import {
  ChallengerState,
  TerminalChallengerState,
  isTerminal as isChallengerTerminal,
  isChallengerState,
  NonTerminalChallengerState,
} from './challenger/states';
import { ProtocolState } from '..';

export type DisputeState = ResponderState | ChallengerState;

export function isTerminal(
  state: DisputeState,
): state is TerminalChallengerState | TerminalResponderState {
  return (
    (isChallengerState(state) && isChallengerTerminal(state)) ||
    (isResponderState(state) && isResponderTerminal(state))
  );
}

export function isDisputeState(state: ProtocolState): state is ChallengerState {
  return isChallengerState(state) || isResponderState(state);
}

export function isNonTerminalDisputeState(
  state: ProtocolState,
): state is NonTerminalChallengerState | NonTerminalResponderState {
  return isDisputeState(state) && !isTerminal(state);
}
