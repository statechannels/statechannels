import {
  OpenChannelState,
  ChannelState,
  isFullyOpen,
  getLastState,
  ChannelParticipant
} from "./channel-store";
import * as walletStates from "./state";
import {SharedData, FundingState} from "./state";
import {ProcessProtocol} from "../communication";
import {CONSENSUS_LIBRARY_ADDRESS} from "../constants";
import {bigNumberify} from "ethers/utils";
import {State} from "@statechannels/nitro-protocol";

export const getOpenedChannelState = (state: SharedData, channelId: string): OpenChannelState => {
  const channelStatus = getChannelState(state, channelId);
  if (!isFullyOpen(channelStatus)) {
    throw new Error(`Channel ${channelId} is still in the process of being opened.`);
  }
  return channelStatus;
};

export const doesAStateExistForChannel = (state: SharedData, channelId: string): boolean => {
  return (
    state.channelStore[channelId] !== undefined &&
    state.channelStore[channelId].signedStates.length > 0
  );
};

export const getAppDefinitionBytecode = (state: SharedData, appDefinition: string): string => {
  return state.bytecodeStorage[appDefinition];
};

export const getChannelState = (state: SharedData, channelId: string): ChannelState => {
  const channelStatus = state.channelStore[channelId];
  if (!channelStatus) {
    throw new Error(`Could not find any initialized channel state for channel ${channelId}.`);
  }
  return channelStatus;
};

export const getLastStateForChannel = (state: SharedData, channelId: string): State => {
  const channelState = getChannelState(state, channelId);
  return getLastState(channelState);
};

export const getFundedLedgerChannelForParticipants = (
  state: SharedData,
  playerA: string,
  playerB: string
): ChannelState | undefined => {
  // Finds a directly funded, two-party channel between players A and B
  return Object.values(state.channelStore).find(channel => {
    const fundingState = getChannelFundingState(state, channel.channelId);
    const directlyFunded: boolean = fundingState ? fundingState.directlyFunded : false;
    return (
      channel.libraryAddress === CONSENSUS_LIBRARY_ADDRESS &&
      // We call concat() on participants in order to not sort it in place
      JSON.stringify(
        channel.participants
          .map(p => p.signingAddress)
          .concat()
          .sort()
      ) === JSON.stringify([playerA, playerB].sort()) &&
      directlyFunded
    );
  });
};
export const getAdjudicatorWatcherSubscribersForChannel = (
  state: walletStates.Initialized,
  channelId: string
): walletStates.ChannelSubscriber[] => {
  if (state.channelSubscriptions[channelId]) {
    return state.channelSubscriptions[channelId];
  } else {
    return [];
  }
};

export const getPrivateKey = (state: walletStates.Initialized) => {
  return state.privateKey;
};

export const getAddress = (state: walletStates.Initialized) => {
  return state.address;
};

export const getAdjudicatorState = (state: SharedData) => {
  return state.adjudicatorState;
};

export const getAdjudicatorChannelState = (state: SharedData, channelId: string) => {
  return getAdjudicatorState(state)[channelId];
};

export const getETHAssetHolderWatcherSubscribersForChannel = (
  state: walletStates.Initialized,
  channelId: string
): walletStates.ChannelSubscriber[] => {
  if (state.channelSubscriptions[channelId]) {
    return state.channelSubscriptions[channelId];
  } else {
    return [];
  }
};

export const getFundingState = (state: SharedData): FundingState => {
  return state.fundingState;
};

export const getChannelFundingState = (
  state: SharedData,
  channelId: string
): walletStates.ChannelFundingState | undefined => {
  return getFundingState(state)[channelId];
};

export const getProtocolForProcessId = (
  state: walletStates.Initialized,
  processId: string
): ProcessProtocol => {
  if (state.processStore[processId]) {
    throw new Error(`No process state for process Id`);
  } else {
    return state.processStore[processId].protocol;
  }
};

export const getProtocolState = (state: walletStates.Initialized, processId: string) => {
  return state.processStore[processId].protocolState;
};

export const getNextNonce = (
  state: SharedData,

  libraryAddress: string
): string => {
  let highestNonce = "-1";
  for (const channelId of Object.keys(state.channelStore)) {
    const channel = state.channelStore[channelId];
    if (
      channel.libraryAddress === libraryAddress &&
      bigNumberify(channel.channelNonce).gt(highestNonce)
    ) {
      highestNonce = channel.channelNonce;
    }
  }
  return bigNumberify(highestNonce)
    .add(1)
    .toHexString();
};

export const getChannelIds = (state: SharedData): string[] => {
  return Object.keys(state.channelStore);
};

export const getAssetHolderAddresses = (state: SharedData): string[] =>
  Object.keys(
    Object.values(state.channelStore).reduce(
      (acc, val) => ({...acc, [val.signedStates[0].state.outcome[0].assetHolderAddress]: 1}),
      {}
    )
  );

// TODO: This is error prone I think
export const getAssetHolderAddress = (state: SharedData, channelId: string): string =>
  state.channelStore[channelId].signedStates[0].state.outcome[0].assetHolderAddress;

export const getParticipants = (state: SharedData, channelId: string): ChannelParticipant[] => {
  const status = walletStates.getChannelStatus(state, channelId);
  return status.participants;
};

export const getParticipantForAddress = (
  state: SharedData,
  address: string
): ChannelParticipant => {
  for (const channelId of Object.keys(state.channelStore)) {
    const channel = state.channelStore[channelId];
    const participantMatch = channel.participants.find(p => p.signingAddress === address);
    if (participantMatch) {
      return participantMatch;
    }
  }
  throw new Error(`Could not find a participant with address ${JSON.stringify(address)}`);
};

export const getParticipantIdForAddress = (state: SharedData, address: string): string => {
  for (const channelId of Object.keys(state.channelStore)) {
    const channel = state.channelStore[channelId];
    const participantMatch = channel.participants.find(p => p.signingAddress === address);
    if (participantMatch && participantMatch.participantId) {
      return participantMatch.participantId;
    }
  }
  throw new Error(`Could not find a participant id for address ${address}`);
};
