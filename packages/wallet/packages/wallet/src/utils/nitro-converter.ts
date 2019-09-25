import { Commitment, CommitmentType, Channel } from 'fmg-core';
import { ChannelStorage, SignedState } from 'nitro-protocol';
import { State } from 'nitro-protocol/lib/src/contract/state';
import { CONSENSUS_LIBRARY_ADDRESS, NETWORK_ID, ETH_ASSET_HOLDER_ADDRESS } from '../constants';
import { appAttributesFromBytes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { encodeConsensusData } from 'nitro-protocol/lib/src/contract/consensus-data';
import { bigNumberify } from 'ethers/utils';
import { Outcome, AllocationItem } from 'nitro-protocol/lib/src/contract/outcome';
import { Channel as NitroChannel } from 'nitro-protocol/lib/src/contract/channel';
import { signState } from 'nitro-protocol/lib/src/signatures';

const CHALLENGE_DURATION = 0x12c; // 5 minutes
// This temporarily handles converting fmg-core entities to nitro-protocol entities
// Eventually once nitro-protocol is more properly embedded in the wallet this will go away

// TODO: Properly set challenge if one exists
export function getChannelStorage(latestCommitment: Commitment): ChannelStorage {
  return {
    turnNumRecord: latestCommitment.turnNum,
  };
}
export function convertCommitmentToSignedState(
  commitment: Commitment,
  privateKey: string,
): SignedState {
  const state = convertCommitmentToState(commitment);
  return signState(state, privateKey);
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
  const outcome = guaranteedChannel
    ? convertGuaranteeToOutcome({ guaranteedChannel, destination })
    : convertAllocationToOutcome({ allocation, destination });

  return {
    turnNum,
    isFinal,
    challengeDuration: CHALLENGE_DURATION,
    appDefinition,
    outcome,
    appData,
    channel: convertToNitroChannel(channel),
  };
}

function convertToNitroChannel(channel: Channel): NitroChannel {
  return {
    channelNonce: bigNumberify(channel.nonce).toHexString(),
    participants: channel.participants,
    chainId: bigNumberify(NETWORK_ID).toHexString(),
  };
}

export function convertAddressToBytes32(address: string): string {
  const normalizedAddress = bigNumberify(address).toHexString();
  if (normalizedAddress.length !== 42) {
    throw new Error(
      `Address value is not right length. Expected length of 42 received length ${
        normalizedAddress.length
      } instead.`,
    );
  }
  // We pad to 66 = (32*2) + 2('0x')
  return normalizedAddress.padEnd(66, '0');
}
function convertAllocationToOutcome({
  allocation,
  destination,
}: {
  allocation: string[];
  destination: string[];
}): Outcome {
  if (allocation.length !== destination.length) {
    throw new Error('Allocation and destination must be the same length');
  }
  const nitroAllocation: AllocationItem[] = allocation.map((a, i) => {
    return {
      destination: convertAddressToBytes32(destination[i]),
      amount: allocation[i],
    };
  });
  return [{ assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, allocation: nitroAllocation }];
}

function convertGuaranteeToOutcome({
  guaranteedChannel,
  destination,
}: {
  guaranteedChannel: string;
  destination: string[];
}): Outcome {
  const guarantee = {
    targetChannelId: guaranteedChannel,
    destinations: destination.map(convertAddressToBytes32),
  };
  return [{ assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, guarantee }];
}
