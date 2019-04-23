import { OpenedState, OPENING, ChannelStatus } from './channel-state/state';
import * as walletStates from './state';
import { SharedData, FundingState } from './state';

export const getOpenedChannelState = (state: SharedData, channelId: string): OpenedState => {
  const channelStatus = getChannelState(state, channelId);
  if (channelStatus.stage === OPENING) {
    throw new Error(`Channel ${channelId} is still in the process of being opened.`);
  }
  return channelStatus;
};

export const getChannelState = (state: SharedData, channelId: string): ChannelStatus => {
  const channelStatus = state.channelState.initializedChannels[channelId];
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
