import { OpenChannelState, ChannelState, isFullyOpen, getLastCommitment } from './channel-store';
import * as walletStates from './state';
import { SharedData, FundingState } from './state';
import { ProcessProtocol } from '../communication';
import { CONSENSUS_LIBRARY_ADDRESS } from '../constants';
import { Commitment } from '../domain';

export const getOpenedChannelState = (state: SharedData, channelId: string): OpenChannelState => {
  const channelStatus = getChannelState(state, channelId);
  if (!isFullyOpen(channelStatus)) {
    throw new Error(`Channel ${channelId} is still in the process of being opened.`);
  }
  return channelStatus;
};

export const doesACommitmentExistForChannel = (state: SharedData, channelId: string): boolean => {
  return (
    state.channelStore[channelId] !== undefined &&
    state.channelStore[channelId].commitments.length > 0
  );
};

export const getChannelState = (state: SharedData, channelId: string): ChannelState => {
  const channelStatus = state.channelStore[channelId];
  if (!channelStatus) {
    throw new Error(`Could not find any initialized channel state for channel ${channelId}.`);
  }
  return channelStatus;
};

export const getLastCommitmentForChannel = (state: SharedData, channelId: string): Commitment => {
  const channelState = getChannelState(state, channelId);
  return getLastCommitment(channelState);
};

export const getFundedLedgerChannelForParticipants = (
  state: SharedData,
  playerA: string,
  playerB: string,
): ChannelState | undefined => {
  // Finds a directly funded, two-party channel between players A and B
  return Object.values(state.channelStore).find(channel => {
    const fundingState = getChannelFundingState(state, channel.channelId);
    const directlyFunded: boolean = fundingState ? fundingState.directlyFunded : false;
    return (
      channel.libraryAddress === CONSENSUS_LIBRARY_ADDRESS &&
      // We call concat() on participants in order to not sort it in place
      JSON.stringify(channel.participants.concat().sort()) ===
        JSON.stringify([playerA, playerB].sort()) &&
      directlyFunded
    );
  });
};
export const getAdjudicatorWatcherProcessesForChannel = (
  state: walletStates.Initialized,
  channelId: string,
): string[] => {
  const processIds: string[] = [];

  for (const processId of Object.keys(state.channelSubscriptions)) {
    const channelsToMonitor = state.channelSubscriptions[processId];
    if (channelsToMonitor.indexOf(channelId) > -1) {
      processIds.push(processId);
    }
  }
  return processIds;
};

export const getAdjudicatorState = (state: SharedData) => {
  return state.adjudicatorState;
};

export const getAdjudicatorChannelState = (state: SharedData, channelId: string) => {
  return getAdjudicatorState(state)[channelId];
};

export const getAdjudicatorChannelBalance = (state: SharedData, channelId: string): string => {
  const adjudicatorChannelState = getAdjudicatorChannelState(state, channelId);
  if (!adjudicatorChannelState) {
    return '0x0';
  } else {
    return adjudicatorChannelState.balance;
  }
};

export const getFundingState = (state: SharedData): FundingState => {
  return state.fundingState;
};

export const getChannelFundingState = (
  state: SharedData,
  channelId: string,
): walletStates.ChannelFundingState | undefined => {
  return getFundingState(state)[channelId];
};

export const getProtocolForProcessId = (
  state: walletStates.Initialized,
  processId: string,
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

  libraryAddress: string,
): number => {
  let highestNonce = -1;
  for (const channelId of Object.keys(state.channelStore)) {
    const channel = state.channelStore[channelId];
    if (channel.libraryAddress === libraryAddress && channel.channelNonce > highestNonce) {
      highestNonce = channel.channelNonce;
    }
  }
  return highestNonce + 1;
};
