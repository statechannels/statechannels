import * as walletStates from '../state';
import * as selectors from '../selectors';
import * as channelStates from '../channel-state/state';

import * as actions from '../actions';
import * as channelActions from '../channel-state/actions';

import { channelStateReducer } from '../channel-state/reducer';
import { accumulateSideEffects } from '../outbox';
import { directFundingStoreReducer } from '../direct-funding-store/reducer';
import { Commitment } from 'fmg-core';
import {
  composePostFundCommitment,
  composeLedgerUpdateCommitment,
} from '../../utils/commitment-utils';
import { WalletProcedure } from '../types';
import { messageRelayRequested } from 'magmo-wallet-client';
import { addHex } from '../../utils/hex-utils';
import { bigNumberify } from 'ethers/utils';
import { ourTurn } from '../../utils/reducer-utils';
import { directFundingStateReducer } from '../direct-funding-store/direct-funding-state/reducer';
import { FundingAction } from '../direct-funding-store/direct-funding-state/actions';

export const appChannelIsWaitingForFunding = (
  state: walletStates.Initialized,
  channelId: string,
): boolean => {
  const appChannel = selectors.getOpenedChannelState(state, channelId);
  return appChannel.type === channelStates.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP;
};

export const safeToSendLedgerUpdate = (
  state: walletStates.Initialized,
  ledgerChannelId: string,
): boolean => {
  const ledgerChannel = selectors.getOpenedChannelState(state, ledgerChannelId);
  return ledgerChannel.type === channelStates.WAIT_FOR_UPDATE && ourTurn(ledgerChannel);
};

export const ledgerChannelFundsAppChannel = (
  state: walletStates.Initialized,
  appChannelId: string,
  ledgerChannelId: string,
): boolean => {
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const appChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const lastCommitment = ledgerChannelState.lastCommitment.commitment;
  const { allocation, destination } = lastCommitment;
  const indexOfTargetChannel = destination.indexOf(appChannelId);
  const appChannelTotal = appChannelState.lastCommitment.commitment.allocation.reduce(addHex);

  return bigNumberify(allocation[indexOfTargetChannel] || '0x0').gte(appChannelTotal);
};

// Global state updaters
export const requestDirectFunding = (
  state: walletStates.Initialized,
  ledgerChannelId: string,
): walletStates.Initialized => {
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const { ourIndex } = ledgerChannelState;
  const { allocation } = ledgerChannelState.lastCommitment.commitment;
  const safeToDeposit = allocation.slice(0, ourIndex).reduce(addHex, '0x0');
  const totalFundingRequested = allocation.reduce(addHex);
  const depositAmount = allocation[ourIndex];

  return updateDirectFundingStatus(
    state,
    actions.internal.directFundingRequested(
      ledgerChannelId,
      safeToDeposit,
      totalFundingRequested,
      depositAmount,
      ourIndex,
    ),
  );
};

export const confirmFundingForChannel = (
  state: walletStates.Initialized,
  channelId: string,
): walletStates.Initialized => {
  return updateChannelState(state, actions.internal.fundingConfirmed(channelId));
};

export const createAndSendPostFundCommitment = (
  state: walletStates.Initialized,
  ledgerChannelId: string,
): walletStates.Initialized => {
  let newState = { ...state };
  const ledgerChannelState = selectors.getOpenedChannelState(newState, ledgerChannelId);
  const appChannelState = selectors.getOpenedChannelState(state, ledgerChannelState.channelId);
  const { commitment, signature } = composePostFundCommitment(
    ledgerChannelState.lastCommitment.commitment,
    ledgerChannelState.ourIndex,
    ledgerChannelState.privateKey,
  );

  newState = receiveOwnLedgerCommitment(state, commitment);

  newState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      theirAddress(appChannelState),
      ledgerChannelId,
      commitment,
      signature,
    ),
  ];
  return newState;
};

export const createAndSendUpdateCommitment = (
  state: walletStates.Initialized,
  appChannelId: string,
  ledgerChannelId: string,
): walletStates.Initialized => {
  const appChannelState = selectors.getOpenedChannelState(state, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];

  // Compose the update commitment
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
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
  const newState = receiveOwnLedgerCommitment(state, commitment);

  // Send out the commitment to the opponent
  newState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      theirAddress(appChannelState),
      appChannelId,
      commitment,
      signature,
    ),
  ];
  return newState;
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
  state: walletStates.Initialized,
  commitment: Commitment,
): walletStates.Initialized => {
  return updateChannelState(state, channelActions.ownCommitmentReceived(commitment));
};

export const receiveOpponentLedgerCommitment = (
  state: walletStates.Initialized,
  commitment: Commitment,
  signature: string,
): walletStates.Initialized => {
  return updateChannelState(
    state,
    channelActions.opponentCommitmentReceived(commitment, signature),
  );
};

export const receiveLedgerCommitment = (
  state: walletStates.Initialized,
  action: actions.CommitmentReceived,
): walletStates.Initialized => {
  return updateChannelState(state, action);
};

// STATE UPDATERS

export const updateChannelState = (
  state: walletStates.Initialized,
  channelAction: actions.channel.ChannelAction,
): walletStates.Initialized => {
  const newState = { ...state };
  const updatedChannelState = channelStateReducer(newState.channelState, channelAction);
  newState.channelState = updatedChannelState.state;
  // App channel state may still generate side effects
  newState.outboxState = accumulateSideEffects(
    newState.outboxState,
    updatedChannelState.sideEffects,
  );
  return newState;
};

export const updateDirectFundingStatus = (
  state: walletStates.Initialized,
  action: FundingAction,
): walletStates.Initialized => {
  const newState = { ...state };
  const updatedDirectFundingStore = directFundingStoreReducer(state.directFundingStore, action);
  newState.directFundingStore = updatedDirectFundingStore.state;
  const updatedDirectFundingState = directFundingStateReducer(
    newState.directFundingStore[action.channelId],
    action,
  );
  newState.directFundingStore[action.channelId] = updatedDirectFundingState.state;
  return newState;
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
    processId,
    procedure: WalletProcedure.IndirectFunding,
    data: { commitment, signature },
  };
  return messageRelayRequested(to, payload);
};
