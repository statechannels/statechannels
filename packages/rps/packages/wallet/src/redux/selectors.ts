import { OpenChannelState, ChannelState, isFullyOpen } from './channel-store';
import * as walletStates from './state';
import { SharedData, FundingState } from './state';
import { WalletProtocol } from './types';

export const getOpenedChannelState = (state: SharedData, channelId: string): OpenChannelState => {
  const channelStatus = getChannelState(state, channelId);
  if (!isFullyOpen(channelStatus)) {
    throw new Error(`Channel ${channelId} is still in the process of being opened.`);
  }
  return channelStatus;
};

export const getChannelState = (state: SharedData, channelId: string): ChannelState => {
  const channelStatus = state.channelStore[channelId];
  if (!channelStatus) {
    throw new Error(`Could not find any initialized channel state for channel ${channelId}.`);
  }
  return channelStatus;
};

export const getAdjudicatorWatcherProcessesForChannel = (
  state: walletStates.Initialized,
  channelId: string,
): string[] => {
  const processIds: string[] = [];

  if (!state.processStore) {
    return processIds;
  }
  for (const processId of Object.keys(state.processStore)) {
    const { channelsToMonitor } = state.processStore[processId];

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
