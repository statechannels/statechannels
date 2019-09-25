import { ChannelState, Commitments } from './states';
import { Commitment, getChannelId, validCommitmentSignature } from '../../../domain';

export function validTransition(state: ChannelState, commitment: Commitment): boolean {
  return (
    commitment.turnNum === state.turnNum + 1 &&
    commitment.channel.nonce === state.channelNonce &&
    commitment.channel.participants[0] === state.participants[0] &&
    commitment.channel.participants[1] === state.participants[1] &&
    commitment.channel.channelType === state.libraryAddress &&
    getChannelId(commitment) === state.channelId
  );
}

export function validCommitmentTransition(first: Commitment, second: Commitment): boolean {
  return second.turnNum === first.turnNum + 1 && getChannelId(first) === getChannelId(second);
}

export function validTransitions(commitments: Commitments): boolean {
  const validSignatures = commitments.reduce((_, c) => {
    if (!validCommitmentSignature(c.commitment, c.signature)) {
      return false;
    }
    return true;
  }, true);
  if (!validSignatures) {
    return false;
  }

  for (let i = 0; i < commitments.length - 1; i += 1) {
    const first = commitments[i];
    const second = commitments[i + 1];
    if (!validCommitmentTransition(first.commitment, second.commitment)) {
      return false;
    }
  }

  return true;
}
