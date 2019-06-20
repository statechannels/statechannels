import { ChannelStore, getChannel, setChannel } from './state';

import { ReducerWithSideEffects } from '../../utils/reducer-utils';
import { StateWithSideEffects } from '../utils';
import {
  SignedCommitment,
  Commitment,
  signCommitment2,
  getChannelId,
  hasValidSignature,
} from '../../domain';
import { pushCommitment, ChannelState, initializeChannel } from './channel-state/states';
import { validTransition } from './channel-state';
import * as channelActions from './actions';

export const channelStoreReducer: ReducerWithSideEffects<ChannelStore> = (
  state: ChannelStore,
  action: channelActions.ChannelAction,
): StateWithSideEffects<ChannelStore> => {
  switch (action.type) {
    case channelActions.OPPONENT_COMMITMENT_RECEIVED:
      const { commitment, signature } = action;
      const checkResult = checkAndStore(state, { commitment, signature });
      // TODO Handle failure cases
      if (checkResult.isSuccess) {
        return { state: checkResult.store };
      }
      break;
    case channelActions.OWN_COMMITMENT_RECEIVED:
      const signResult = signAndStore(state, action.commitment);
      // TODO Handle failure cases
      if (signResult.isSuccess) {
        return { state: signResult.store };
      }
      break;
  }
  return { state };
};

// -----------------
// NEW FUNCTIONALITY
// -----------------

interface SignSuccess {
  isSuccess: true;
  signedCommitment: SignedCommitment;
  store: ChannelStore;
}

interface SignFailure {
  isSuccess: false;
  reason: SignFailureReason;
}

export type SignFailureReason = 'ChannelDoesntExist' | 'TransitionUnsafe' | 'NotOurTurn';
type SignResult = SignSuccess | SignFailure;
// TODO: These methods could probably be part of signAndStore/checkAndStore but that means
// that the address/privateKey would be required when calling them.
// That would make them difficult to use from other protocols.
export function signAndInitialize(
  store: ChannelStore,
  commitment: Commitment,
  privateKey: string,
): SignResult {
  const signedCommitment = signCommitment2(commitment, privateKey);
  if (!hasValidSignature(signedCommitment)) {
    return { isSuccess: false, reason: 'NotOurTurn' };
  }
  if (signedCommitment.commitment.turnNum !== 0) {
    return { isSuccess: false, reason: 'ChannelDoesntExist' };
  }
  const channel = initializeChannel(signedCommitment, privateKey);
  store = setChannel(store, channel);

  return { isSuccess: true, signedCommitment, store };
}

export function checkAndInitialize(
  store: ChannelStore,
  signedCommitment: SignedCommitment,
  privateKey: string,
): CheckResult {
  if (signedCommitment.commitment.turnNum !== 0) {
    return { isSuccess: false };
  }
  if (!hasValidSignature(signedCommitment)) {
    return { isSuccess: false };
  }
  const channel = initializeChannel(signedCommitment, privateKey);
  store = setChannel(store, channel);

  return { isSuccess: true, store };
}

// Signs and stores a commitment from our own app or wallet.
// Doesn't work for the first state - the channel must already exist.
export function signAndStore(store: ChannelStore, commitment: Commitment): SignResult {
  const channelId = getChannelId(commitment);
  let channel = getChannel(store, channelId);
  const signedCommitment = signCommitment2(commitment, channel.privateKey);

  // this next check is weird. It'll check whether it was our turn.
  // Maybe this should be done as part of signCommitment2
  if (!hasValidSignature(signedCommitment)) {
    return { isSuccess: false, reason: 'NotOurTurn' };
  }

  // store if safe
  if (!isSafeTransition(store, channel, commitment)) {
    return { isSuccess: false, reason: 'TransitionUnsafe' };
  }

  channel = pushCommitment(channel, signedCommitment);
  store = setChannel(store, channel);

  return { isSuccess: true, signedCommitment, store };
}

interface CheckSuccess {
  isSuccess: true;
  store: ChannelStore;
}

interface CheckFailure {
  isSuccess: false;
}

type CheckResult = CheckSuccess | CheckFailure;

// For use with a signed commitment received from an opponent.
export function checkAndStore(
  store: ChannelStore,
  signedCommitment: SignedCommitment,
): CheckResult {
  if (!hasValidSignature(signedCommitment)) {
    console.log('Failed to validate commitment signature');
    return { isSuccess: false };
  }
  const commitment = signedCommitment.commitment;
  const channelId = getChannelId(commitment);
  let channel = getChannel(store, channelId);

  if (!isSafeTransition(store, channel, commitment)) {
    console.log('Failed to verify a safe transition');
    return { isSuccess: false };
  }

  channel = pushCommitment(channel, signedCommitment);
  store = setChannel(store, channel);

  return { isSuccess: true, store };
}

// Currently just checks for validTransition
// In the future might check things like value preservation in the network.
function isSafeTransition(
  store: ChannelStore,
  channel: ChannelState,
  commitment: Commitment,
): boolean {
  return validTransition(channel, commitment);
}
