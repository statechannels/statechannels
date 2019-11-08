import {SignedState, getChannelId} from "@statechannels/nitro-protocol";

export function channelFromStates(
  states: SignedState[],
  ourAddress: string,
  ourPrivateKey: string
) {
  const numStates = states.length;
  const lastState = states[numStates - 1];
  const {turnNum, channel, appDefinition: libraryAddress} = lastState.state;

  const participants: [string, string] = channel.participants as [string, string];
  let funded = true;
  if (turnNum <= 1) {
    funded = false;
  }
  const ourIndex = participants.indexOf(ourAddress);
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
    signedStates: states
  };
}
