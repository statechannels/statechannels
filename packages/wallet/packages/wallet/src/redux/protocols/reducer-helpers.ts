import { SIGNATURE_SUCCESS, VALIDATION_SUCCESS, fundingSuccess } from 'magmo-wallet-client';
import * as actions from '../actions';
import { channelStoreReducer } from '../channel-store/reducer';
import { accumulateSideEffects } from '../outbox';
import { SideEffects } from '../outbox/state';
import { SharedData, queueMessage } from '../state';
import * as selectors from '../selectors';
import { PlayerIndex } from '../types';
import { CommitmentType } from 'fmg-core/lib/commitment';
import * as magmoWalletClient from 'magmo-wallet-client';
import { ChannelState } from '../channel-store';

export const updateChannelState = (
  sharedData: SharedData,
  channelAction: actions.channel.ChannelAction,
): SharedData => {
  const newSharedData = { ...sharedData };
  const updatedChannelState = channelStoreReducer(newSharedData.channelStore, channelAction);
  newSharedData.channelStore = updatedChannelState.state;
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

export function sendFundingComplete(sharedData: SharedData, appChannelId: string) {
  const channelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const lastCommitment = channelState.lastCommitment.commitment;
  if (
    lastCommitment.commitmentType !== CommitmentType.PostFundSetup ||
    lastCommitment.turnNum !== 3
  ) {
    throw new Error(
      `Expected a post fund setup B commitment. Instead received ${JSON.stringify(
        lastCommitment,
      )}.`,
    );
  }
  return queueMessage(sharedData, fundingSuccess(appChannelId, lastCommitment));
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

export function sendConcludeSuccess(sharedData: SharedData): SharedData {
  const newSharedData = { ...sharedData };
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoWalletClient.concludeSuccess(),
  });
  return newSharedData;
}

export function sendOpponentConcluded(sharedData: SharedData): SharedData {
  const newSharedData = { ...sharedData };
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoWalletClient.opponentConcluded(),
  });
  return newSharedData;
}

export function sendConcludeFailure(
  sharedData: SharedData,
  reason: 'Other' | 'UserDeclined',
): SharedData {
  const newSharedData = { ...sharedData };
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: magmoWalletClient.concludeFailure(reason),
  });
  return newSharedData;
}

export const channelIsClosed = (channelId: string, sharedData: SharedData): boolean => {
  return (
    channelHasConclusionProof(channelId, sharedData) ||
    channelFinalizedOnChain(channelId, sharedData)
  );
};

export const channelHasConclusionProof = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const { lastCommitment, penultimateCommitment } = channelState;
  return (
    lastCommitment.commitment.commitmentType === CommitmentType.Conclude &&
    penultimateCommitment.commitment.commitmentType === CommitmentType.Conclude
  );
};

export const channelFinalizedOnChain = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getAdjudicatorChannelState(sharedData, channelId);
  return channelState && channelState.finalized;
};

export const isChannelDirectlyFunded = (channelId: string, sharedData: SharedData): boolean => {
  const channelFundingState = selectors.getChannelFundingState(sharedData, channelId);
  if (!channelFundingState) {
    throw new Error(`No funding state for ${channelId}. Cannot determine funding type.`);
  }
  return channelFundingState.directlyFunded;
};

export const getFundingChannelId = (channelId: string, sharedData: SharedData): string => {
  const channelFundingState = selectors.getChannelFundingState(sharedData, channelId);
  if (!channelFundingState) {
    throw new Error(`No funding state for ${channelId}. Cannot determine funding type.`);
  }

  if (!channelFundingState.fundingChannel) {
    throw new Error('No funding channel id defined.');
  }
  return channelFundingState.fundingChannel;
};

export const isFirstPlayer = (channelId: string, sharedData: SharedData) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.ourIndex === PlayerIndex.A;
};

export function getOpponentAddress(channelState: ChannelState, playerIndex: PlayerIndex) {
  const { participants } = channelState;
  const opponentAddress = participants[(playerIndex + 1) % participants.length];
  return opponentAddress;
}
