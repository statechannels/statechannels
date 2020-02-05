import {
  getChannelId,
  State,
  SignedState,
  getVariablePart,
  ForceMoveAppContractInterface
} from "@statechannels/nitro-protocol";

import {defaultAbiCoder, Interface, bigNumberify} from "ethers/utils";

import {hasValidSignature} from "../../../utils/signing-utils";

import {ChannelState} from "./states";

export function validTransition(channelState: ChannelState, state: State): boolean {
  const channelNonce = state.channel.channelNonce;
  const channelId = getChannelId(state.channel);

  return (
    state.turnNum === channelState.turnNum + 1 &&
    channelNonce === channelState.channelNonce &&
    state.channel.participants[0] === channelState.participants[0].signingAddress &&
    state.channel.participants[1] === channelState.participants[1].signingAddress &&
    channelId === channelState.channelId
  );
}

export function validStateTransition(first: State, second: State): boolean {
  return (
    second.turnNum === first.turnNum + 1 &&
    getChannelId(first.channel) === getChannelId(second.channel)
  );
}

export function validAppTransition(
  channelState: ChannelState,
  toState: State,
  bytecode: string
): boolean {
  if (bigNumberify(bytecode).isZero()) {
    return true;
  }
  const fromState = channelState.signedStates[channelState.signedStates.length - 1].state;
  const numberOfParticipants = toState.channel.participants.length;
  const fromVariablePart = getVariablePart(fromState);
  const toVariablePart = getVariablePart(toState);
  const turnNumB = toState.turnNum;
  const txData = new Interface(ForceMoveAppContractInterface.abi).functions.validTransition.encode([
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants
  ]);
  const result = window.PureEVM.exec(
    // NOTE: A Buffer polyfill is added by webpack in the browser. It is a primitive in Node.JS
    // https://github.com/webpack/docs/wiki/internal-webpack-plugins#nodenodesourcepluginoptions
    Uint8Array.from(Buffer.from(bytecode.substr(2), "hex")),
    Uint8Array.from(Buffer.from(txData.substr(2), "hex"))
  );
  return defaultAbiCoder.decode(["bool"], result)[0] as boolean;
}

export function validTransitions(states: SignedState[]): boolean {
  const validSignatures = states.reduce((_, s) => {
    if (!hasValidSignature(s)) {
      return false;
    }
    return true;
  }, true);
  if (!validSignatures) {
    return false;
  }

  for (let i = 0; i < states.length - 1; i += 1) {
    const first = states[i];
    const second = states[i + 1];
    if (!validStateTransition(first.state, second.state)) {
      return false;
    }
  }

  return true;
}
