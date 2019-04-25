import { FundingState as PlayerAFundingState } from './player-a/states';
import { FundingState as PlayerBFundingState } from './player-b/states';

import * as playerA from './player-a/states';
import * as playerB from './player-b/states';
import { ProtocolState } from '..';

export type FundingState = PlayerAFundingState | PlayerBFundingState;

export { playerA, playerB };

export function isFundingState(state: ProtocolState): state is FundingState {
  return playerA.isFundingState(state) || playerB.isFundingState(state);
}

export function isTerminal(
  state: ProtocolState,
): state is playerA.TerminalFundingState | playerB.TerminalFundingState {
  return (
    (playerA.isFundingState(state) && playerA.isTerminal(state)) ||
    (playerB.isFundingState(state) && playerB.isTerminal(state))
  );
}
