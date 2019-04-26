import { ChannelState } from './states';
import { Commitment, getChannelId } from '../../../domain';

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
