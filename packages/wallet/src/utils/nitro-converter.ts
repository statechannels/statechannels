import { Commitment, CommitmentType, Channel } from "fmg-core";
import { CONSENSUS_LIBRARY_ADDRESS, NETWORK_ID, ETH_ASSET_HOLDER_ADDRESS } from "../constants";
import { appAttributesFromBytes } from "fmg-nitro-adjudicator/lib/consensus-app";
import { bigNumberify } from "ethers/utils";
import {
  SignedState,
  State,
  encodeConsensusData,
  Channel as NitroChannel,
  Signatures,
  AllocationItem,
  Outcome,
  isAllocationOutcome
} from "@statechannels/nitro-protocol";

const CHALLENGE_DURATION = 0x12c; // 5 minutes
// This temporarily handles converting fmg-core entities to nitro-protocol entities
// Eventually once nitro-protocol is more properly embedded in the wallet this will go away

export function convertStateToCommitment(state: State): Commitment {
  const { channel: nitroChannel, turnNum } = state;
  const convertedOutcome = convertOutcomeToAllocation(state.outcome);
  const fmgChannel: Channel = {
    participants: nitroChannel.participants,
    channelType: state.appDefinition,
    nonce: bigNumberify(nitroChannel.channelNonce).toNumber(),
    guaranteedChannel: convertedOutcome.guaranteedChannel,
  };

   let commitmentType = CommitmentType.App;
  // TODO: If this method is being for prefund/postfund states
  // we'll need the correct commitmentCount
  const commitmentCount = 0;
  if (state.isFinal) {
    commitmentType = CommitmentType.Conclude;
  } else if (state.turnNum < nitroChannel.participants.length) {
    commitmentType = CommitmentType.PreFundSetup;
  } else if (state.turnNum < 2 * nitroChannel.participants.length) {
    commitmentType = CommitmentType.PostFundSetup;
  }
  return {
    ...convertedOutcome,
    channel: fmgChannel,
    turnNum,
    commitmentType,
    commitmentCount,
    appAttributes: state.appData,
  };
}

export function convertCommitmentToSignedState(commitment: Commitment, privateKey: string): SignedState {
  const state = convertCommitmentToState(commitment);
  return Signatures.signState(state, privateKey);
}

export function convertCommitmentToState(commitment: Commitment): State {
  const { turnNum, commitmentType, channel, destination, allocation, appAttributes } = commitment;
  const appDefinition = channel.channelType;
  let appData = appAttributes;
  // If its consensus app we know the wallet authored it so we switch it over
  // to new consensus app here
  if (appDefinition === CONSENSUS_LIBRARY_ADDRESS) {
    const fmgConsensusData = appAttributesFromBytes(appAttributes);
    const { proposedAllocation, proposedDestination, furtherVotesRequired } = fmgConsensusData;
    const proposedOutcome = convertAllocationToOutcome({
      allocation: proposedAllocation,
      destination: proposedDestination,
    });
    appData = encodeConsensusData({ furtherVotesRequired, proposedOutcome });
  }
  const isFinal = commitmentType === CommitmentType.Conclude;
  const { guaranteedChannel } = channel;
  const outcome =
    guaranteedChannel && !bigNumberify(guaranteedChannel).eq(0)
      ? convertGuaranteeToOutcome({ guaranteedChannel, destination })
      : convertAllocationToOutcome({ allocation, destination });

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
    chainId: bigNumberify(NETWORK_ID).toHexString(),
  };
}

export function convertBytes32ToAddress(bytes32: string): string {
  const normalized = bigNumberify(bytes32).toHexString();
  return normalized.slice(-42);
}

// e.g.,
// 0x9546E319878D2ca7a21b481F873681DF344E0Df8 becomes
// 0x0000000000000000000000009546E319878D2ca7a21b481F873681DF344E0Df8
export function convertAddressToBytes32(address: string): string {
  const normalizedAddress = bigNumberify(address).toHexString();
  if (normalizedAddress.length !== 42) {
    throw new Error(`Address value is not right length. Expected length of 42 received length ${normalizedAddress.length} instead.`);
  }
  // We pad to 66 = (32*2) + 2('0x')
  return `0x${normalizedAddress.substr(2).padStart(64, "0")}`;
}
function convertAllocationToOutcome({ allocation, destination }: { allocation: string[]; destination: string[] }): Outcome {
  if (allocation.length !== destination.length) {
    throw new Error("Allocation and destination must be the same length");
  }
  const nitroAllocation: AllocationItem[] = allocation.map((a, i) => {
    return {
      destination: convertAddressToBytes32(destination[i]).toLowerCase(),
      amount: allocation[i],
    };
  });
  return [{ assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, allocation: nitroAllocation }];
}

function convertGuaranteeToOutcome({ guaranteedChannel, destination }: { guaranteedChannel: string; destination: string[] }): Outcome {
  const guarantee = {
    targetChannelId: convertAddressToBytes32(guaranteedChannel),
    destinations: destination.map(convertAddressToBytes32).map(d => d.toLowerCase()),
  };
  return [{ assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, guarantee }];
}

function convertOutcomeToAllocation(outcome: Outcome): { allocation: string[]; destination: string[]; guaranteedChannel?: string } {
  const allocation: string[] = [];
  let destination: string[] = [];
  let guaranteedChannel;
  // We will only be dealing with one outcome initially, since we're converting from a commitment
  if (outcome.length !== 1) {
    throw new Error(`Currently the wallet only supports one outcome, however there were ${outcome.length} outcomes.`);
  }
  const assetOutcome = outcome[0];
  if (isAllocationOutcome(assetOutcome)) {
    assetOutcome.allocation.forEach(a => {
      allocation.push(a.amount);
      destination.push(convertBytes32ToAddress(a.destination).toLowerCase());
    });
  } else {
    const { guarantee } = assetOutcome;
    destination = destination.concat(guarantee.destinations.map(convertBytes32ToAddress).map(d => d.toLowerCase()));
    guaranteedChannel = convertBytes32ToAddress(guarantee.targetChannelId);
  }

   return { allocation, destination, guaranteedChannel };
}
