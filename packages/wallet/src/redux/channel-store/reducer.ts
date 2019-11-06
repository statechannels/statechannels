import {ChannelStore, getChannel, setChannel} from "./state";

import {hasValidSignature, getCommitmentChannelId} from "../../domain/commitments/index";
import {pushState, initializeChannel} from "./channel-state/states";
import {State, SignedState, getChannelId} from "@statechannels/nitro-protocol";
import {Signatures} from "@statechannels/nitro-protocol";
import {convertStateToCommitment} from "../../utils/nitro-converter";
import {validTransition} from "./channel-state/valid-transition";
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
export function signAndInitialize(store: ChannelStore, state: State, privateKey: string): SignResult {
  const signedState = Signatures.signState(state, privateKey);

  if (signedState.state.turnNum !== 0) {
    return {isSuccess: false, reason: "ChannelDoesntExist"};
  }
  const channel = initializeChannel(signedState, privateKey);
  store = setChannel(store, channel);

  return {isSuccess: true, signedState, store};
}

export function checkAndInitialize(store: ChannelStore, signedState: SignedState, privateKey: string): CheckResult {
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

// Signs and stores a commitment from our own app or wallet.
// Doesn't work for the first state - the channel must already exist.
export function signAndStore(store: ChannelStore, state: State): SignResult {
  // TODO: Temporary until everything is converted to use signedStates
  // This is ugly but we attempt to find the channel by both the commitment's channel Id and the state's channel Id
  // That way protocols that are using commitments should still work
  let channel;
  const commitment = convertStateToCommitment(state);
  const commitmentChannelId = getCommitmentChannelId(commitment);
  if (commitmentChannelId in store) {
    channel = getChannel(store, commitmentChannelId);
  } else {
    const channelId = getChannelId(state.channel);
    channel = getChannel(store, channelId);
  }

  const signedState = Signatures.signState(state, channel.privateKey);
  if (!validTransition(channel, commitment)) {
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

// For use with a signed commitment received from an opponent.
export function checkAndStore(store: ChannelStore, signedState: SignedState): CheckResult {
  if (!hasValidSignature(signedState)) {
    console.log("Failed to validate commitment signature");
    return {isSuccess: false};
  }

  // TODO: Temporary until everything is converted to use signedStates
  // This is ugly but we attempt to find the channel by both the commitment's channel Id and the state's channel Id
  // That way protocols that are using commitments should still work
  let channel;
  const commitment = convertStateToCommitment(signedState.state);
  const commitmentChannelId = getCommitmentChannelId(commitment);
  if (commitmentChannelId in store) {
    channel = getChannel(store, commitmentChannelId);
  } else {
    const channelId = getChannelId(signedState.state.channel);
    channel = getChannel(store, channelId);
  }

  if (!validTransition(channel, commitment)) {
    return {isSuccess: false};
  }
  channel = pushState(channel, signedState);
  store = setChannel(store, channel);

  return {isSuccess: true, store};
}
