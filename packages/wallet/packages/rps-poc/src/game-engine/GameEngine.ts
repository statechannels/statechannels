import GameEngineA from './GameEngineA';
import GameEngineB from './GameEngineB';
import { Position } from './positions';
import { Player, State as ApplicationState } from './application-states';

export type GameEngine = GameEngineA | GameEngineB;

// todo: probably shouldn't be a class
export function setupGame({ me, opponent, stake, balances }:
  { me: string, opponent: string, stake: number, balances: number[] }
) {
  return GameEngineA.setupGame({ me, opponent, stake, balances });
}

export function fromProposal(proposedStartPosition: Position) {
  return GameEngineB.fromProposal(proposedStartPosition);
}

// todo: state type
export function fromState(state: ApplicationState) {
  switch (state.player) {
    case Player.PlayerA:
      return GameEngineA.fromState(state);
    case Player.PlayerB:
      return GameEngineB.fromState(state);
  }
}
