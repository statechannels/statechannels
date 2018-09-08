import GameEngineA from './GameEngineA';
import GameEngineB from './GameEngineB';
import { Position } from './positions';
import { Player, State as ApplicationState } from './application-states';
import BN from 'bn.js';

export type GameEngine = GameEngineA | GameEngineB;

// todo: probably shouldn't be a class
export function setupGame({ me, opponent, stake, balances }:
  { me: string, opponent: string, stake: BN, balances: BN[] }
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
