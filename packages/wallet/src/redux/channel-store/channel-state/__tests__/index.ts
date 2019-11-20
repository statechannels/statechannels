import {SignedState, getChannelId} from "@statechannels/nitro-protocol";
import {trivialAppBytecode, consensusAppBytecode} from "../../../__tests__/state-helpers";
import {CONSENSUS_LIBRARY_ADDRESS} from "../../../../constants";

export function channelFromStates(
  states: SignedState[],
  ourAddress: string,
  ourPrivateKey: string
) {
  const numStates = states.length;
  const lastState = states[numStates - 1];
  const {turnNum, channel, appDefinition: libraryAddress} = lastState.state;

  const participants = channel.participants.map(p => {
    return {signingAddress: p, destination: p, participantId: p};
  });
  let funded = true;
  if (turnNum <= 1) {
    funded = false;
  }
  const ourIndex = participants.map(p => p.signingAddress).indexOf(ourAddress);
  if (ourIndex === -1) {
    throw new Error("Address provided is not a participant according to the lastState.");
  }

  return {
    channelId: getChannelId(channel),
    libraryAddress,
    channelNonce: channel.channelNonce,
    funded,
    participants,
    address: ourAddress,
    privateKey: ourPrivateKey,
    ourIndex,
    turnNum,
    signedStates: states,
    bytecode:
      lastState.state.appDefinition === CONSENSUS_LIBRARY_ADDRESS
        ? consensusAppBytecode
        : trivialAppBytecode
  };
}
