import {ChannelState, Commitments} from "./states";
import {Commitment, validCommitmentSignature} from "../../../domain";
import {getCommitmentChannelId} from "../../../domain/commitments";
import {bigNumberify} from "ethers/utils";
import {convertCommitmentToState} from "../../../utils/nitro-converter";
import {getChannelId} from "@statechannels/nitro-protocol";

export function validTransition(state: ChannelState, commitment: Commitment): boolean {
  const commitmentNonce = bigNumberify(commitment.channel.nonce).toHexString();
  const commitmentChannelId = getCommitmentChannelId(commitment);
  const channelId = getChannelId(convertCommitmentToState(commitment).channel);
  return (
    commitment.turnNum === state.turnNum + 1 &&
    commitmentNonce === state.channelNonce &&
    commitment.channel.participants[0] === state.participants[0] &&
    commitment.channel.participants[1] === state.participants[1] &&
    commitment.channel.channelType === state.libraryAddress &&
    (commitmentChannelId === state.channelId || channelId === state.channelId)
  );
}

export function validCommitmentTransition(first: Commitment, second: Commitment): boolean {
  return second.turnNum === first.turnNum + 1 && getCommitmentChannelId(first) === getCommitmentChannelId(second);
}

export function validTransitions(commitments: Commitments): boolean {
  const validSignatures = commitments.reduce((_, c) => {
    if (!validCommitmentSignature(c.commitment, c.signature)) {
      return false;
    }
    return true;
  }, true);
  if (!validSignatures) {
    return false;
  }

  for (let i = 0; i < commitments.length - 1; i += 1) {
    const first = commitments[i];
    const second = commitments[i + 1];
    if (!validCommitmentTransition(first.commitment, second.commitment)) {
      return false;
    }
  }

  return true;
}
