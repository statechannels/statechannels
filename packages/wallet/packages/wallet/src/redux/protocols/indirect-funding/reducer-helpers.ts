import { bigNumberify } from 'ethers/utils';
import { Commitment } from '../../../domain';
import { WalletEvent } from 'magmo-wallet-client';
import {
  composeLedgerUpdateCommitment,
  composePostFundCommitment,
} from '../../../utils/commitment-utils';
import { addHex } from '../../../utils/hex-utils';
import { ourTurn } from '../../../utils/reducer-utils';
import * as actions from '../../actions';
import * as channelActions from '../../channel-store/actions';
import * as channelStates from '../../channel-store/state';
import { queueMessage as queueMessageOutbox } from '../../outbox/state';
import { ProtocolStateWithSharedData } from '../../protocols';
import { FundingAction } from '../../protocols/direct-funding/actions';
import {
  DirectFundingState,
  FUNDING_SUCCESS,
  initialDirectFundingState,
} from '../../protocols/direct-funding/state';
import * as selectors from '../../selectors';
import { setChannel, SharedData } from '../../state';
import { directFundingStateReducer } from '../direct-funding/reducer';
import {
  confirmFundingForChannel,
  createCommitmentMessageRelay,
  theirAddress,
  updateChannelState,
} from '../reducer-helpers';

export { confirmFundingForChannel, createCommitmentMessageRelay };

export const directFundingIsComplete = (directFundingState: DirectFundingState): boolean => {
  return directFundingState.type === FUNDING_SUCCESS;
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
  processId: string,
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
    processId,
    ledgerChannelId,
    safeToDeposit,
    totalFundingRequested,
    depositAmount,
    ourIndex,
  );
  return initialDirectFundingState(action, sharedData);
};

export const updateDirectFundingStatus = (
  directFundingState: DirectFundingState,
  sharedData: SharedData,
  action: FundingAction,
): ProtocolStateWithSharedData<DirectFundingState> => {
  return directFundingStateReducer(directFundingState, sharedData, action);
};

export const initializeChannelState = (
  sharedData: SharedData,
  channelState: channelStates.ChannelState,
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
