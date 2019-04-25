import { Commitment } from 'fmg-core';
import { messageRelayRequested, SIGNATURE_SUCCESS, VALIDATION_SUCCESS } from 'magmo-wallet-client';
import * as channelStates from '../channel-state/state';
import * as actions from '../actions';
import { channelStateReducer } from '../channel-state/reducer';
import { accumulateSideEffects } from '../outbox';
import { SideEffects } from '../outbox/state';
import { SharedData } from '../state';
import { WalletProtocol } from '../types';
import * as magmoWalletClient from 'magmo-wallet-client';

export const updateChannelState = (
  sharedData: SharedData,
  channelAction: actions.channel.ChannelAction,
): SharedData => {
  const newSharedData = { ...sharedData };
  const updatedChannelState = channelStateReducer(newSharedData.channelState, channelAction);
  newSharedData.channelState = updatedChannelState.state;
  // TODO: Currently we need to filter out signature/validation messages that are meant to the app
  // This might change based on whether protocol reducers or channel reducers craft commitments
  const filteredSideEffects = filterOutSignatureMessages(updatedChannelState.sideEffects);
  // App channel state may still generate side effects
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, filteredSideEffects);
  return newSharedData;
};

export const filterOutSignatureMessages = (sideEffects?: SideEffects): SideEffects | undefined => {
  if (sideEffects && sideEffects.messageOutbox) {
    let messageArray = Array.isArray(sideEffects.messageOutbox)
      ? sideEffects.messageOutbox
      : [sideEffects.messageOutbox];
    messageArray = messageArray.filter(
      walletEvent =>
        walletEvent.type !== VALIDATION_SUCCESS && walletEvent.type !== SIGNATURE_SUCCESS,
    );
    return {
      ...sideEffects,
      messageOutbox: messageArray,
    };
  }
  return sideEffects;
};

export const confirmFundingForChannel = (sharedData: SharedData, channelId: string): SharedData => {
  return updateChannelState(sharedData, actions.internal.fundingConfirmed(channelId));
};

export const createCommitmentMessageRelay = (
  protocol: WalletProtocol,
  to: string,
  processId: string,
  commitment: Commitment,
  signature: string,
) => {
  const payload = {
    protocol,
    data: { commitment, signature, processId },
  };
  return messageRelayRequested(to, payload);
};

export function theirAddress(channelState: channelStates.OpenedState) {
  const theirIndex = (channelState.ourIndex + 1) % channelState.participants.length;
  return channelState.participants[theirIndex];
}

export function showWallet(sharedData: SharedData): SharedData {
  const newSharedData = { ...sharedData };
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    displayOutbox: magmoWalletClient.showWallet(),
  });
  return newSharedData;
}

export function hideWallet(sharedData: SharedData): SharedData {
  const newSharedData = { ...sharedData };
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    displayOutbox: magmoWalletClient.hideWallet(),
  });
  return newSharedData;
}
