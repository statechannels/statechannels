import * as selectors from '../../selectors';
import * as channelStates from '../../channel-state/state';

import * as actions from '../../actions';
import * as channelActions from '../../channel-state/actions';

import { channelStateReducer } from '../../channel-state/reducer';
import { Commitment } from 'fmg-core';
import {
  composePostFundCommitment,
  composeLedgerUpdateCommitment,
} from '../../../utils/commitment-utils';
import { WalletProtocol } from '../../types';
import {
  messageRelayRequested,
  WalletEvent,
  VALIDATION_SUCCESS,
  SIGNATURE_SUCCESS,
} from 'magmo-wallet-client';
import { addHex } from '../../../utils/hex-utils';
import { bigNumberify } from 'ethers/utils';
import { ourTurn } from '../../../utils/reducer-utils';
import { ProtocolStateWithSharedData } from '../../protocols';
import { queueMessage as queueMessageOutbox, SideEffects } from '../../outbox/state';
import {
  DirectFundingState,
  initialDirectFundingState,
  CHANNEL_FUNDED,
} from '../../protocols/direct-funding/state';
import { FundingAction } from '../../protocols/direct-funding/actions';
import { directFundingStateReducer } from '../direct-funding/reducer';
import { accumulateSideEffects } from '../../outbox';
import { SharedData, setChannel } from '../../state';

export const directFundingIsComplete = (directFundingState: DirectFundingState): boolean => {
  return directFundingState.channelFundingStatus === CHANNEL_FUNDED;
};

export const appChannelIsWaitingForFunding = (
  sharedData: SharedData,
  channelId: string,
): boolean => {
  const appChannel = selectors.getOpenedChannelState(sharedData, channelId);
  return appChannel.type === channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP;
};

export const safeToSendLedgerUpdate = (
  sharedData: SharedData,
  ledgerChannelId: string,
): boolean => {
  const ledgerChannel = selectors.getOpenedChannelState(sharedData, ledgerChannelId);
  return ledgerChannel.type === channelStates.WAIT_FOR_UPDATE && ourTurn(ledgerChannel);
};

export const ledgerChannelFundsAppChannel = (
  sharedData: SharedData,
  appChannelId: string,
  ledgerChannelId: string,
): boolean => {
  const ledgerChannelState = selectors.getOpenedChannelState(sharedData, ledgerChannelId);
  const appChannelState = selectors.getOpenedChannelState(sharedData, ledgerChannelId);
  const lastCommitment = ledgerChannelState.lastCommitment.commitment;
  const { allocation, destination } = lastCommitment;
  const indexOfTargetChannel = destination.indexOf(appChannelId);
  const appChannelTotal = appChannelState.lastCommitment.commitment.allocation.reduce(addHex);

  return bigNumberify(allocation[indexOfTargetChannel] || '0x0').gte(appChannelTotal);
};

export const confirmFundingForChannel = (sharedData: SharedData, channelId: string): SharedData => {
  return updateChannelState(sharedData, actions.internal.fundingConfirmed(channelId));
};

export const createAndSendPostFundCommitment = (
  sharedData: SharedData,
  ledgerChannelId: string,
): SharedData => {
  let newSharedData = { ...sharedData };
  const ledgerChannelState = selectors.getOpenedChannelState(newSharedData, ledgerChannelId);
  const appChannelState = selectors.getOpenedChannelState(
    newSharedData,
    ledgerChannelState.channelId,
  );
  const { commitment, signature } = composePostFundCommitment(
    ledgerChannelState.lastCommitment.commitment,
    ledgerChannelState.ourIndex,
    ledgerChannelState.privateKey,
  );

  newSharedData = receiveOwnLedgerCommitment(newSharedData, commitment);

  newSharedData.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      theirAddress(appChannelState),
      ledgerChannelId,
      commitment,
      signature,
    ),
  ];
  return newSharedData;
};

export const createAndSendUpdateCommitment = (
  sharedData: SharedData,
  appChannelId: string,
  ledgerChannelId: string,
): SharedData => {
  const appChannelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];

  // Compose the update commitment
  const ledgerChannelState = selectors.getOpenedChannelState(sharedData, ledgerChannelId);
  const { commitment: lastLedgerCommitment } = ledgerChannelState.lastCommitment;
  const { commitment, signature } = composeLedgerUpdateCommitment(
    lastLedgerCommitment.channel,
    ledgerChannelState.turnNum + 1,
    ledgerChannelState.ourIndex,
    proposedAllocation,
    proposedDestination,
    lastLedgerCommitment.allocation,
    lastLedgerCommitment.destination,
    ledgerChannelState.privateKey,
  );

  // Update our ledger channel with the latest commitment
  const newSharedState = receiveOwnLedgerCommitment(sharedData, commitment);

  // Send out the commitment to the opponent
  newSharedState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      theirAddress(appChannelState),
      appChannelId,
      commitment,
      signature,
    ),
  ];
  return newSharedState;
};

// RECEIVING COMMITMENTS

// NOTES on receiving a commitment
// When the ledger channel is in the FUNDING stage,
// `receiveOwnCommitment` and `receiveOpponentCommitment` are ignored, by the
// channelState reducer, while `receiveCommitment` triggers a channel state
// update (and puts a message in the outbox)
// When the ledger channel is _not_ in the FUNDING stage, it is the opposite.
// This needs to be considered when deciding what action to pass to the channelState
// reducer

export const receiveOwnLedgerCommitment = (
  sharedData: SharedData,
  commitment: Commitment,
): SharedData => {
  return updateChannelState(sharedData, channelActions.ownCommitmentReceived(commitment));
};

export const receiveOpponentLedgerCommitment = (
  sharedData: SharedData,
  commitment: Commitment,
  signature: string,
): SharedData => {
  return updateChannelState(
    sharedData,
    channelActions.opponentCommitmentReceived(commitment, signature),
  );
};

export const receiveLedgerCommitment = (
  sharedData: SharedData,
  action: actions.CommitmentReceived,
): SharedData => {
  return updateChannelState(sharedData, action);
};

// STATE UPDATERS
// Global state updaters
export const requestDirectFunding = (
  sharedData: SharedData,
  ledgerChannelId: string,
): ProtocolStateWithSharedData<DirectFundingState> => {
  const ledgerChannelState = selectors.getChannelState(sharedData, ledgerChannelId);
  const { ourIndex } = ledgerChannelState;
  const { allocation } = ledgerChannelState.lastCommitment.commitment;
  const safeToDeposit = allocation.slice(0, ourIndex).reduce(addHex, '0x0');
  const totalFundingRequested = allocation.reduce(addHex);
  const depositAmount = allocation[ourIndex];
  const action = actions.internal.directFundingRequested(
    ledgerChannelId,
    safeToDeposit,
    totalFundingRequested,
    depositAmount,
    ourIndex,
  );
  return initialDirectFundingState(action, sharedData);
};

const filterOutSignatureMessages = (sideEffects?: SideEffects): SideEffects | undefined => {
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

export const updateDirectFundingStatus = (
  directFundingState: DirectFundingState,
  sharedData: SharedData,
  action: FundingAction,
): ProtocolStateWithSharedData<DirectFundingState> => {
  return directFundingStateReducer(directFundingState, sharedData, action);
};

function theirAddress(appChannelState: channelStates.OpenedState) {
  const theirIndex = (appChannelState.ourIndex + 1) % appChannelState.participants.length;
  return appChannelState.participants[theirIndex];
}

export const createCommitmentMessageRelay = (
  to: string,
  processId: string,
  commitment: Commitment,
  signature: string,
) => {
  const payload = {
    protocol: WalletProtocol.IndirectFunding,
    data: { commitment, signature, processId },
  };
  return messageRelayRequested(to, payload);
};

export const initializeChannelState = (
  sharedData: SharedData,
  channelState: channelStates.ChannelStatus,
): SharedData => {
  return setChannel(sharedData, channelState);
};

export const queueMessage = (sharedData: SharedData, message: WalletEvent) => {
  const newSharedData = { ...sharedData };
  return {
    ...newSharedData,
    outboxState: queueMessageOutbox(newSharedData.outboxState, message),
  };
};
