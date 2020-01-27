import {ChannelStore, getChannel, setChannel} from "./state";
import {pushState, initializeChannel, ChannelParticipant} from "./channel-state/states";
import {State, SignedState, getChannelId, hashState} from "@statechannels/nitro-protocol";
import {Signatures} from "@statechannels/nitro-protocol";
import {validTransition, validAppTransition} from "./channel-state/valid-transition";
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

export type SignFailureReason = "ChannelDoesNotExist" | "TransitionUnsafe" | "NotOurTurn";
type SignResult = SignSuccess | SignFailure;
// TODO: These methods could probably be part of signAndStore/checkAndStore but that means
// that the address/privateKey would be required when calling them.
// That would make them difficult to use from other protocols.
export function signAndInitialize(
  store: ChannelStore,
  state: State,
  privateKey: string,
  participants: ChannelParticipant[],
  bytecode: string
): SignResult {
  const signedState = Signatures.signState(state, privateKey);

  if (signedState.state.turnNum !== 0) {
    return {isSuccess: false, reason: "ChannelDoesNotExist"};
  }
  const channel = initializeChannel(signedState, privateKey, participants);
  store = setChannel(store, channel);

  return {isSuccess: true, signedState, store};
}

export function checkAndInitialize(
  store: ChannelStore,
  signedState: SignedState,
  privateKey: string,
  participants: ChannelParticipant[],
  bytecode?: string
): CheckResult {
  if (signedState.state.turnNum !== 0) {
    return {isSuccess: false};
  }

  if (!hasValidSignature(signedState)) {
    return {isSuccess: false};
  }

  const channel = initializeChannel(signedState, privateKey, participants);

  if (bytecode && !validAppTransition(channel, signedState.state, bytecode)) {
    return {isSuccess: false};
  }

  store = setChannel(store, channel);

  return {isSuccess: true, store};
}

// Signs and stores a state from our own app or wallet.
// Doesn't work for the first state - the channel must already exist.
export function signAndStore(store: ChannelStore, state: State, bytecode: string): SignResult {
  const channelId = getChannelId(state.channel);
  let channel = getChannel(store, channelId);

  if (!validTransition(channel, state)) {
    return {isSuccess: false, reason: "TransitionUnsafe"};
  }

  if (!validAppTransition(channel, state, bytecode)) {
    return {isSuccess: false, reason: "TransitionUnsafe"};
  }

  const signedState = Signatures.signState(state, channel.privateKey);

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
  reason?: string;
}

interface CheckFailure {
  isSuccess: false;
  reason?: string;
}

type CheckResult = CheckSuccess | CheckFailure;

// For use with a signed state received from an opponent.
export function checkAndStore(
  store: ChannelStore,
  signedState: SignedState,
  bytecode?: string
): CheckResult {
  const channelId = getChannelId(signedState.state.channel);

  let channelState = getChannel(store, channelId);

  if (channelState.turnNum === signedState.state.turnNum) {
    if (
      hashState(channelState.signedStates[channelState.signedStates.length - 1].state) ===
      hashState(signedState.state)
    ) {
      return {isSuccess: true, store};
    } else {
      return {
        isSuccess: false,
        reason: "Invalid state: received non-identical state with same turnNum"
      };
    }
  }

  if (!hasValidSignature(signedState)) {
    console.log("Failed to validate state signature");
    return {isSuccess: false, reason: "Failed to validate state signature"};
  }

  if (!validTransition(channelState, signedState.state)) {
    return {isSuccess: false, reason: "Invalid force move framework state transition"};
  }

  if (bytecode && !validAppTransition(channelState, signedState.state, bytecode)) {
    return {isSuccess: false, reason: "Invalid app-specific state transition"};
  }

  channelState = pushState(channelState, signedState);

  store = setChannel(store, channelState);

  return {isSuccess: true, store};
}
