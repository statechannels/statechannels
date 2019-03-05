import { Commitment } from 'fmg-core';
import { WalletState } from '../states';
import { channelID } from 'fmg-core/lib/channel';

export function unreachable(x: never) {
  return x;
}

export const validTransition = (fromState: WalletState, toCommitment: Commitment) => {
  // todo: check the game rules

  if (!('turnNum' in fromState)) {
    return false;
  }
  if (!('libraryAddress' in fromState)) {
    return false;
  }

  return (
    toCommitment.turnNum === fromState.turnNum + 1 &&
    toCommitment.channel.nonce === fromState.channelNonce &&
    toCommitment.channel.participants[0] === fromState.participants[0] &&
    toCommitment.channel.participants[1] === fromState.participants[1] &&
    toCommitment.channel.channelType === fromState.libraryAddress &&
    channelID(toCommitment.channel) === fromState.channelId
  );
};

export const ourTurn = (state: WalletState) => {
  if (!('turnNum' in state)) {
    return false;
  }
  return state.turnNum % 2 !== state.ourIndex;
};
