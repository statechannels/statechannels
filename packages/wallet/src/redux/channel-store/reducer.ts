import {ChannelStore, getChannel, setChannel} from "./state";
import {pushState, initializeChannel} from "./channel-state/states";
import {State, SignedState, getChannelId} from "@statechannels/nitro-protocol";
import {Signatures} from "@statechannels/nitro-protocol";
import {validTransition} from "./channel-state/valid-transition";
import {hasValidSignature} from "../../utils/signing-utils";
// -----------------
// NEW FUNCTIONALITY
// -----------------

interface SignSuccess {
  isSuccess: true;
  signedState: SignedState;
  store: ChannelStore;
}

interface SignFailure {
  isSuccess: false;
  reason: SignFailureReason;
}

export type SignFailureReason = "ChannelDoesntExist" | "TransitionUnsafe" | "NotOurTurn";
type SignResult = SignSuccess | SignFailure;
// TODO: These methods could probably be part of signAndStore/checkAndStore but that means
// that the address/privateKey would be required when calling them.
// That would make them difficult to use from other protocols.
export function signAndInitialize(
  store: ChannelStore,
  state: State,
  privateKey: string
): SignResult {
  const signedState = Signatures.signState(state, privateKey);

  if (signedState.state.turnNum !== 0) {
    return {isSuccess: false, reason: "ChannelDoesntExist"};
  }
  const channel = initializeChannel(signedState, privateKey);
  store = setChannel(store, channel);

  return {isSuccess: true, signedState, store};
}

export function checkAndInitialize(
  store: ChannelStore,
  signedState: SignedState,
  privateKey: string
): CheckResult {
  if (signedState.state.turnNum !== 0) {
    return {isSuccess: false};
  }
  if (!hasValidSignature(signedState)) {
    return {isSuccess: false};
  }
  const channel = initializeChannel(signedState, privateKey);

  store = setChannel(store, channel);

  return {isSuccess: true, store};
}

// Signs and stores a state from our own app or wallet.
// Doesn't work for the first state - the channel must already exist.
export function signAndStore(store: ChannelStore, state: State): SignResult {
  const channelId = getChannelId(state.channel);
  let channel = getChannel(store, channelId);

  const signedState = Signatures.signState(state, channel.privateKey);
  if (!validTransition(channel, state)) {
    return {isSuccess: false, reason: "TransitionUnsafe"};
  }

  channel = pushState(channel, signedState);
  store = setChannel(store, channel);

  return {
    isSuccess: true,
    signedState,
    store
  };
}

interface CheckSuccess {
  isSuccess: true;
  store: ChannelStore;
}

interface CheckFailure {
  isSuccess: false;
}

type CheckResult = CheckSuccess | CheckFailure;

// For use with a signed state received from an opponent.
export function checkAndStore(store: ChannelStore, signedState: SignedState): CheckResult {
  if (!hasValidSignature(signedState)) {
    console.log("Failed to validate state signature");
    return {isSuccess: false};
  }
  const channelId = getChannelId(signedState.state.channel);
  let channel = getChannel(store, channelId);
  if (!validTransition(channel, signedState.state)) {
    return {isSuccess: false};
  }
  channel = pushState(channel, signedState);
  store = setChannel(store, channel);

  return {isSuccess: true, store};
}
