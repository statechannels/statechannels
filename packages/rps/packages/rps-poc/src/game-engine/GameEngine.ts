import GameEngineA from './GameEngineA';
import GameEngineB from './GameEngineB';
import Message from './Message';
import ChannelWallet from './ChannelWallet';
import { Player, State as ApplicationState } from './application-states';

export type GameEngine = GameEngineA | GameEngineB;

// todo: probably shouldn't be a class
export function setupGame({ opponent, stake, balances, wallet }:
  { opponent: string, stake: number, balances: number[], wallet: ChannelWallet }
) {
  return GameEngineA.setupGame({ opponent, stake, balances, wallet });
}

export function fromProposal({ message, wallet }: { message: Message, wallet: ChannelWallet }) {
  return GameEngineB.fromProposal({ message, wallet });
}

// todo: state type
export function fromState({ state, wallet }: { state: ApplicationState, wallet: ChannelWallet }) {
  switch (state.player) {
    case Player.PlayerA:
      return GameEngineA.fromState({ state, wallet });
    case Player.PlayerB:
      return GameEngineB.fromState({ state, wallet });
  }
}
