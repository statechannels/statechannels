import GameEngineA from './GameEngineA';
import GameEngineB from './GameEngineB';
import Move from './Move';
import { Player, State as ApplicationState } from './application-states';
import { Wallet } from '../wallet';

export type GameEngine = GameEngineA | GameEngineB;

// todo: probably shouldn't be a class
export function setupGame({ opponent, stake, balances, wallet }:
  { opponent: string, stake: number, balances: number[], wallet: Wallet }
) {
  return GameEngineA.setupGame({ opponent, stake, balances, wallet });
}

export function fromProposal({ move, wallet }: { move: Move, wallet: Wallet }) {
  return GameEngineB.fromProposal({ move, wallet });
}

// todo: state type
export function fromState({ state, wallet }: { state: ApplicationState, wallet: Wallet }) {
  switch (state.player) {
    case Player.PlayerA:
      return GameEngineA.fromState({ state, wallet });
    case Player.PlayerB:
      return GameEngineB.fromState({ state, wallet });
  }
}
