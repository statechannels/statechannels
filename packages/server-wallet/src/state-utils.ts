import {
  ChannelConstants,
  Hashed,
  SignedStateVarsWithHash,
  State,
  calculateChannelId,
  toNitroState,
  convertToInternalParticipant,
  deserializeOutcome,
  SignedState,
  SignedStateWithHash,
  wireStateToNitroState,
  makeAddress,
} from '@statechannels/wallet-core';
import {hashState} from '@statechannels/wasm-utils';
import _ from 'lodash';
import {SignedState as WireSignedState} from '@statechannels/wire-format';

import {recoverAddress as wasmRecoverAddress} from './utilities/signatures';
import {Bytes32} from './type-aliases';
import {Channel} from './models/channel';
import {recordFunctionMetrics} from './metrics';

export const dropNonVariables = (s: SignedStateVarsWithHash): SignedStateVarsWithHash =>
  _.pick(s, 'appData', 'outcome', 'isFinal', 'turnNum', 'stateHash', 'signatures');

export const dropNonConstants = (s: State): ChannelConstants =>
  _.pick(s, 'channelNonce', 'chainId', 'participants', 'appDefinition', 'challengeDuration');

export const addHash = <T extends State = State>(s: T): T & Hashed => ({
  ...s,
  stateHash: recordFunctionMetrics(hashState(toNitroState(s))),
});
export const addHashes = (c: Channel): Channel =>
  _.assign(c, {vars: c.vars.map(v => addHash({...c.channelConstants, ...v})) as any});

export const addChannelId = <T extends ChannelConstants = ChannelConstants>(
  c: T
): T & {channelId: Bytes32} => {
  (c as any).channelId = calculateChannelId(c);

  return c as any;
};

/**
 * Fold a new signed state into an existing list of signed states (variable parts only).
 *
 * @param vars - list of signed states
 * @param signedState - new signed state
 *
 * A signed state _may_ be a new signature on an existing signed state, in which case
 * we want to "fold" it in by adding a signature to the existing signed state object.
 *
 * In the other case, it represents a brand new state, so we simply push it to the end
 * of the list of existing signed states.
 */
export function addState(
  vars: SignedStateVarsWithHash[],
  signedState: SignedStateWithHash
): SignedStateVarsWithHash[] {
  const {stateHash, signatures} = signedState;

  const ret = _.cloneDeep(vars);

  const existing = _.find(ret, ['stateHash', stateHash]);

  if (existing) {
    existing.signatures = _.uniqBy([...existing.signatures, ...signatures], 'signature');
  } else {
    ret.push(signedState);
  }

  return ret;
}

/**
 * Retrieve a list of states that must be stored to ensure future secure protocol execution.
 *
 * @param signedStates - list of signed states of arbitrary length
 * @param support - a support (list of signed states)
 *
 * Should remove states in signedStates which are not a part of the support.
 */
export function clearOldStates(
  signedStates: SignedStateVarsWithHash[],
  support: SignedStateWithHash[] | undefined
): SignedStateVarsWithHash[] {
  let sorted = _.reverse(_.sortBy(signedStates, s => s.turnNum));

  // If we don't have a supported state we don't clean anything out
  if (support && support.length > 0) {
    // The support is returned in descending turn number so we need to grab
    // the last element to find the earliest state
    const {stateHash: firstSupportStateHash} = support[support.length - 1];

    // Find where the first support state is in our current state array
    const supportIndex = sorted.findIndex(sv => sv.stateHash === firstSupportStateHash);

    // Take everything before that
    sorted = sorted.slice(0, supportIndex + 1);
  }

  return sorted;
}

/**
 * Deserializes a state but uses the wasm utility method local to the server-wallet
 * package. This, as opposed to the JS implementation inside wallet-core.
 */
export function fastDeserializeState(channelId: Bytes32, state: WireSignedState): SignedState {
  const {outcome, participants, signatures} = state;

  const nitroState = wireStateToNitroState(state);

  const signatureEntries = signatures.map(signature => {
    const signer = wasmRecoverAddress(signature, nitroState);

    if (!nitroState.channel.participants.includes(signer))
      throw new Error(`Recovered address ${signer} is not a participant in channel ${channelId}`);

    return {signature, signer};
  });

  return {
    ...state,
    appDefinition: makeAddress(state.appDefinition),
    outcome: deserializeOutcome(outcome),
    participants: participants.map(convertToInternalParticipant),
    signatures: signatureEntries,
  };
}
