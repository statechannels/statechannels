import {Commitment, CommitmentType, Channel, mover} from "fmg-core";
import {CONSENSUS_LIBRARY_ADDRESS, NETWORK_ID, ETH_ASSET_HOLDER_ADDRESS} from "../constants";
import {appAttributesFromBytes} from "fmg-nitro-adjudicator/lib/consensus-app";
import {bigNumberify} from "ethers/utils";
import {
  ChannelStorage,
  SignedState,
  State,
  encodeConsensusData,
  Channel as NitroChannel,
  Signatures,
  AllocationItem,
  hashOutcome,
  hashState,
  Outcome
} from "@statechannels/nitro-protocol";

const CHALLENGE_DURATION = 0x12c; // 5 minutes
// This temporarily handles converting fmg-core entities to nitro-protocol entities
// Eventually once nitro-protocol is more properly embedded in the wallet this will go away

export function getChannelStorage(latestCommitment: Commitment): ChannelStorage {
  const state = convertCommitmentToState(latestCommitment);
  return {
    turnNumRecord: latestCommitment.turnNum,
    finalizesAt: 1e12, // TODO: Compute......
    stateHash: hashState(state),
    challengerAddress: mover(latestCommitment),
    outcomeHash: hashOutcome(state.outcome)
  };
}

export function convertCommitmentToSignedState(commitment: Commitment, privateKey: string): SignedState {
  const state = convertCommitmentToState(commitment);
  return Signatures.signState(state, privateKey);
}

export function convertCommitmentToState(commitment: Commitment): State {
  const {turnNum, commitmentType, channel, destination, allocation, appAttributes} = commitment;
  const appDefinition = channel.channelType;
  let appData = appAttributes;
  // If its consensus app we know the wallet authored it so we switch it over
  // to new consensus app here
  if (appDefinition === CONSENSUS_LIBRARY_ADDRESS) {
    const fmgConsensusData = appAttributesFromBytes(appAttributes);
    const {proposedAllocation, proposedDestination, furtherVotesRequired} = fmgConsensusData;
    const proposedOutcome = convertAllocationToOutcome({
      allocation: proposedAllocation,
      destination: proposedDestination
    });
    appData = encodeConsensusData({furtherVotesRequired, proposedOutcome});
  }
  const isFinal = commitmentType === CommitmentType.Conclude;
  const {guaranteedChannel} = channel;
  const outcome = guaranteedChannel
    ? convertGuaranteeToOutcome({guaranteedChannel, destination})
    : convertAllocationToOutcome({allocation, destination});

  return {
    turnNum,
    isFinal,
    challengeDuration: CHALLENGE_DURATION,
    appDefinition,
    outcome,
    appData,
    channel: convertToNitroChannel(channel)
  } as State;
}

function convertToNitroChannel(channel: Channel): NitroChannel {
  return {
    channelNonce: bigNumberify(channel.nonce).toHexString(),
    participants: channel.participants,
    chainId: bigNumberify(NETWORK_ID).toHexString()
  };
}

// e.g.,
// 0x9546E319878D2ca7a21b481F873681DF344E0Df8 becomes
// 0x0000000000000000000000009546E319878D2ca7a21b481F873681DF344E0Df8
export function convertAddressToBytes32(address: string): string {
  const normalizedAddress = bigNumberify(address).toHexString();
  if (normalizedAddress.length !== 42) {
    throw new Error(
      `Address value is not right length. Expected length of 42 received length ${normalizedAddress.length} instead.`
    );
  }
  // We pad to 66 = (32*2) + 2('0x')
  return `0x${normalizedAddress.substr(2).padStart(64, "0")}`;
}
function convertAllocationToOutcome({allocation, destination}: {allocation: string[]; destination: string[]}): Outcome {
  if (allocation.length !== destination.length) {
    throw new Error("Allocation and destination must be the same length");
  }
  const nitroAllocation: AllocationItem[] = allocation.map((a, i) => {
    return {
      destination: convertAddressToBytes32(destination[i]),
      amount: allocation[i]
    };
  });
  return [{assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, allocation: nitroAllocation}];
}

function convertGuaranteeToOutcome({
  guaranteedChannel,
  destination
}: {
  guaranteedChannel: string;
  destination: string[];
}): Outcome {
  const guarantee = {
    targetChannelId: convertAddressToBytes32(guaranteedChannel),
    destinations: destination.map(convertAddressToBytes32)
  };
  return [{assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, guarantee}];
}
