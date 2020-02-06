import {
  Outcome,
  State,
  Channel,
  isAllocationOutcome,
  convertBytes32ToAddress,
  convertAddressToBytes32
} from "@statechannels/nitro-protocol";
import {bigNumberify, randomBytes} from "ethers/utils";

import {
  UpdateChannelParams,
  Allocations,
  CreateChannelParams
} from "@statechannels/client-api-schema";

import {NETWORK_ID, CHALLENGE_DURATION, ETH_ASSET_HOLDER_ADDRESS} from "../constants";

// TODO: Figure out how these should have been used
// interface OpenChannel {
//   type: "Channel.Open";
//   participants: ChannelParticipant[];
//   signedState: SignedState;
// }
// interface ChannelJoined {
//   type: "Channel.Joined";
//   signedState: SignedState;
// }

// interface ChannelUpdated {
//   type: "Channel.Updated";
//   signedState: SignedState;
// }

// type WalletMessage = OpenChannel | ChannelJoined | RelayableAction | ChannelUpdated;

function createAllocationOutcomeFromParams(params: Allocations): Outcome {
  return params.map(p => {
    return {
      // TODO: Need to look up the the asset holder for the token
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocationItems: p.allocationItems.map(a => {
        return {
          destination: convertAddressToBytes32(a.destination),
          amount: a.amount
        };
      })
    };
  });
}

export function createJsonRpcAllocationsFromOutcome(outcome: Outcome): Allocations {
  return outcome.map(o => {
    if (!isAllocationOutcome(o)) {
      throw new Error("Attempted to convert non allocation outcome to an allocation");
    }
    return {
      token: o.assetHolderAddress,
      allocationItems: o.allocationItems.map(a => ({
        amount: a.amount,
        destination: convertBytes32ToAddress(a.destination)
      }))
    };
  });
}

// TODO: Error handling
export function createStateFromCreateChannelParams(params: CreateChannelParams): State {
  const {appData, appDefinition} = params;

  // TODO: We should implement a nonce negotiation protocol once it's fully specced out
  const channelNonce = bigNumberify(randomBytes(32)).toHexString();
  const channel: Channel = {
    channelNonce,
    participants: params.participants.map(p => p.signingAddress),
    chainId: bigNumberify(NETWORK_ID).toHexString()
  };
  return {
    channel,
    challengeDuration: CHALLENGE_DURATION,
    appData,
    appDefinition,
    outcome: createAllocationOutcomeFromParams(params.allocations),
    turnNum: 0,
    isFinal: false
  };
}

// TODO: Error handling
export function createStateFromUpdateChannelParams(
  state: State,
  params: UpdateChannelParams
): State {
  const {appData, allocations} = params;

  // TODO: check for valid transition using EVM library

  // TODO: Check if this is a final state... I guess it couldn't be

  return {
    ...state,
    turnNum: state.turnNum + 1,
    outcome: createAllocationOutcomeFromParams(allocations),
    appData
  };
}
