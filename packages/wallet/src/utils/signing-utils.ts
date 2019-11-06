import {Signatures, SignedState} from "@statechannels/nitro-protocol";

export function hasValidSignature(signedState: SignedState): boolean {
  const signerAddress = Signatures.getStateSignerAddress(signedState);
  const {state} = signedState;
  const {participants} = state.channel;
  return participants.indexOf(signerAddress) === state.turnNum % participants.length;
}
