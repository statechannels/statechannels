import { ChannelState, getLastCommitment, Commitments } from './states';
import {
  Commitment,
  getChannelId,
  fromCoreCommitment,
  validCommitmentSignature,
} from '../../../domain';
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
  const lastCommitment = getLastCommitment(state);

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

export function validCommitmentTransition(first: Commitment, second: Commitment): boolean {
  return (
    second.turnNum === first.turnNum + 1 &&
    getChannelId(first) === getChannelId(second) &&
    validAppTransition(first, second)
  );
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
