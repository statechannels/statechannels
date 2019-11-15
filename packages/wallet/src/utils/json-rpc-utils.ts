import {Outcome, State, Channel, isAllocationOutcome} from "@statechannels/nitro-protocol";
import {bigNumberify, randomBytes} from "ethers/utils";
import {NETWORK_ID, CHALLENGE_DURATION} from "../constants";

export interface JsonRpcParticipant {
  participantId: string;
  signingAddress: string;
  destination: string;
}

export interface JsonRpcAllocationItem {
  destination: string;
  amount: string;
}
export type JsonRpcAllocations = JsonRpcAllocation[];

export interface JsonRpcAllocation {
  token: string;
  allocationItems: JsonRpcAllocationItem[];
}

export interface JsonRpcCreateChannelParams {
  participants: JsonRpcParticipant[];
  allocations: JsonRpcAllocations;
  appDefinition: string;
  appData: string;
}

export interface JsonRpcUpdateChannelParams {
  allocations: JsonRpcAllocations;
  appData: string;
  channelId: string;
}

function createAllocationOutcomeFromParams(params: JsonRpcAllocations): Outcome {
  return params.map(p => {
    return {assetHolderAddress: p.token, allocation: p.allocationItems};
  });
}

export function createJsonRpcAllocationsFromOutcome(outcome: Outcome): JsonRpcAllocations {
  return outcome.map(o => {
    if (!isAllocationOutcome(o)) {
      throw new Error("Attempted to convert non allocation outcome to an allocation");
    }
    return {
      token: o.assetHolderAddress,
      allocationItems: o.allocation
    };
  });
}

// TODO: Error handling
export function createStateFromCreateChannelParams(params: JsonRpcCreateChannelParams): State {
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
  params: JsonRpcUpdateChannelParams
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
