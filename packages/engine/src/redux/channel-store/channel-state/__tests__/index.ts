import {ChannelState} from "../states";
import {getCommitmentChannelId, SignedCommitment} from "../../../../domain/commitments";
import {bigNumberify} from "ethers/utils";

export function channelFromCommitments(
  commitments: SignedCommitment[],
  ourAddress: string,
  ourPrivateKey: string
): ChannelState {
  const numCommitments = commitments.length;
  const lastCommitment = commitments[numCommitments - 1];
  const {turnNum, channel} = lastCommitment.commitment;
  const libraryAddress = channel.channelType;
  const participants: [string, string] = channel.participants as [string, string];
  let funded = true;
  if (turnNum <= 1) {
    funded = false;
  }
  const ourIndex = participants.indexOf(ourAddress);
  if (ourIndex === -1) {
    throw new Error("Address provided is not a participant according to the lastCommitment.");
  }

  return {
    channelId: getCommitmentChannelId(lastCommitment.commitment),
    libraryAddress,
    channelNonce: bigNumberify(lastCommitment.commitment.channel.nonce).toHexString(),
    funded,
    participants,
    address: ourAddress,
    privateKey: ourPrivateKey,
    ourIndex,
    turnNum,
    signedStates: commitments.map(c => c.signedState)
  };
}
