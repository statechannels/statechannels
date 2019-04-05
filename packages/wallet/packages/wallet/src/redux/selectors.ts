import { OpenedState, OPENING, ChannelStatus } from './channel-state/state';
import * as walletStates from './state';
import * as indirectFundingStates from './indirect-funding/state';
import { DirectFundingState } from './direct-funding-store/direct-funding-state/state';

export const getOpenedChannelState = (
  state: walletStates.Initialized,
  channelId: string,
): OpenedState => {
  const channelStatus = getChannelState(state, channelId);
  if (channelStatus.stage === OPENING) {
    throw new Error(`Channel ${channelId} is still in the process of being opened.`);
  }
  return channelStatus;
};

export const getChannelState = (
  state: walletStates.Initialized,
  channelId: string,
): ChannelStatus => {
  const channelStatus = state.channelState.initializedChannels[channelId];
  if (!channelStatus) {
    throw new Error(`Could not find any initialized channel state for channel ${channelId}.`);
  }
  return channelStatus;
};

// TODO: Ideally we should be able to pass in a expected state type and have the selector either return that type of state or throw an error
export function getIndirectFundingState(
  state: walletStates.Initialized,
): indirectFundingStates.IndirectFundingState {
  if (!state.indirectFunding) {
    throw new Error('Indirect Funding state is not defined.');
  }
  return state.indirectFunding;
}

export const getDirectFundingState = (
  state: walletStates.Initialized,
  channelId: string,
): DirectFundingState => {
  const fundingStatus = state.directFundingStore.directFunding[channelId];
  if (!fundingStatus) {
    throw new Error(`No funding status for channel ${channelId}`);
  }
  return fundingStatus;
};
