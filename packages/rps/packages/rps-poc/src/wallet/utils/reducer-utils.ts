import { WalletState } from "..";
import { State } from "fmg-core";

export function unreachable(x: never) { return x; }

export const validTransition = (fromState: WalletState, toState: State) => {
  // todo: check the game rules

  if (!('turnNum' in fromState)) { return false; }
  if (!('libraryAddress' in fromState)) { return false; }

  return (toState.turnNum === fromState.turnNum + 1) &&
    (toState.channel.channelNonce === fromState.channelNonce) &&
    (toState.channel.participants[0] === fromState.participants[0]) &&
    (toState.channel.participants[1] === fromState.participants[1]) &&
    (toState.channel.channelType === fromState.libraryAddress) &&
    (toState.channel.id === fromState.channelId);
};

export const ourTurn = (state: WalletState) => {
  if (!('turnNum' in state)) { return false; }

  return state.turnNum % 2 !== state.ourIndex;
};
