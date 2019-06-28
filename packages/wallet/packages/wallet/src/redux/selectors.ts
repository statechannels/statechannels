import { OpenChannelState, ChannelState, isFullyOpen, getLastCommitment } from './channel-store';
import * as walletStates from './state';
import { SharedData, FundingState } from './state';
import { WalletProtocol } from '../communication';
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

export const getExistingLedgerChannelForParticipants = (
  state: SharedData,
  playerA: string,
  playerB: string,
): ChannelState | undefined => {
  for (const existingChannelId of Object.keys(state.channelStore)) {
    const channel = state.channelStore[existingChannelId];
    if (
      channel.libraryAddress === CONSENSUS_LIBRARY_ADDRESS &&
      channel.participants.indexOf(playerA) > -1 &&
      channel.participants.indexOf(playerB) > -1
    ) {
      return channel;
    }
  }
  return undefined;
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
): walletStates.ChannelFundingState => {
  return state.fundingState[channelId];
};

export const getProtocolForProcessId = (
  state: walletStates.Initialized,
  processId: string,
): WalletProtocol => {
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
