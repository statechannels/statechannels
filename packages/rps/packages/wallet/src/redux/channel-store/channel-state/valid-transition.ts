import { ChannelState } from './states';
import { Commitment, getChannelId, fromCoreCommitment } from '../../../domain';
import { isAppCommitment } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { validTransition as validConsensusTransition } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { getConsensusContractAddress } from '../../../utils/contract-utils';

const ledgerAddress = getConsensusContractAddress();
const validators = {
  [ledgerAddress]: (lastCommitment: Commitment, commitment: Commitment) => {
    const c = fromCoreCommitment(lastCommitment);
    return !isAppCommitment(c) || validConsensusTransition(c, fromCoreCommitment(commitment));
  },
};

function validAppTransition(c1: Commitment, c2: Commitment): boolean {
  const { channelType } = c1.channel;

  const validator = validators[channelType];
  if (!validator) {
    console.warn('Validator not found');
    return true;
  }

  return validator(c1, c2);
}

export function validTransition(state: ChannelState, commitment: Commitment): boolean {
  const { commitment: lastCommitment } = state.lastCommitment;

  return (
    commitment.turnNum === state.turnNum + 1 &&
    commitment.channel.nonce === state.channelNonce &&
    commitment.channel.participants[0] === state.participants[0] &&
    commitment.channel.participants[1] === state.participants[1] &&
    commitment.channel.channelType === state.libraryAddress &&
    getChannelId(commitment) === state.channelId &&
    validAppTransition(lastCommitment, commitment)
  );
}
