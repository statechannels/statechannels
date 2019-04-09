import * as walletStates from '../../state';
import * as states from './state';
import * as actions from '../../actions';
import { unreachable } from '../../../utils/reducer-utils';
import { PlayerIndex, WalletProcedure } from '../../types';

import { Channel } from 'fmg-core';
import { channelID } from 'magmo-wallet-client/node_modules/fmg-core/lib/channel';
import * as channelState from '../../channel-state/state';
import { Commitment } from 'fmg-core/lib/commitment';
import { channelStateReducer } from '../../channel-state/reducer';
import * as channelActions from '../../channel-state/actions';
import { messageRelayRequested, WalletEvent } from 'magmo-wallet-client';
import * as selectors from '../../selectors';
import * as channelStates from '../../channel-state/state';
import { addHex } from '../../../utils/hex-utils';
import { accumulateSideEffects } from '../../outbox';
import {
  composeLedgerUpdateCommitment,
  composePostFundCommitment,
  composePreFundCommitment,
} from '../../../utils/commitment-utils';
import { isFundingAction } from '../../internal/actions';
import { bigNumberify } from 'ethers/utils';
import { directFundingStoreReducer } from '../../direct-funding-store/reducer';
import { CHANNEL_FUNDED } from '../../direct-funding-store/direct-funding-state/state';
import { waitForPreFundSetup } from '../../channel-state/state';
import { SignedCommitment } from 'src/redux/channel-state/shared/state';

export function playerAReducer(
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized {
  if (!state.indirectFunding) {
    return state;
  }

  if (state.indirectFunding.player !== PlayerIndex.A) {
    return state;
  }

  switch (state.indirectFunding.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApprovalReducer(state, action);
    case states.WAIT_FOR_PRE_FUND_SETUP_1:
      return waitForPreFundSetup1Reducer(state, action);
    case states.WAIT_FOR_DIRECT_FUNDING:
      return waitForDirectFunding(state, action);
    case states.WAIT_FOR_POST_FUND_SETUP_1:
      return waitForPostFundSetup1(state, action);
    case states.WAIT_FOR_LEDGER_UPDATE_1:
      return waitForLedgerUpdateReducer(state, action);
    default:
      return unreachable(state.indirectFunding);
  }
}

const waitForLedgerUpdateReducer = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const indirectFundingState = selectors.getIndirectFundingState(
        state,
      ) as states.WaitForLedgerUpdate1;

      // Update ledger state
      let newState = receiveLedgerCommitment(state, action.commitment, action.signature);
      if (
        ledgerChannelFundsAppChannel(
          newState,
          indirectFundingState.channelId,
          indirectFundingState.ledgerId,
        )
      ) {
        newState = confirmFundingForAppChannel(newState, indirectFundingState.channelId);
      }
      return newState;
    default:
      return state;
  }
};

const waitForPostFundSetup1 = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const indirectFundingState = selectors.getIndirectFundingState(
        state,
      ) as states.WaitForPostFundSetup1;

      let newState = receiveLedgerCommitment(state, action.commitment, action.signature);

      if (ledgerChannelIsWaitingForUpdate(newState, indirectFundingState.ledgerId)) {
        newState = createAndSendUpdateCommitment(
          newState,
          indirectFundingState.channelId,
          indirectFundingState.ledgerId,
        );
        newState.indirectFunding = states.waitForLedgerUpdate1(indirectFundingState);
      }

      return newState;

    default:
      return state;
  }
};
const waitForDirectFunding = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  const indirectFundingState = selectors.getIndirectFundingState(
    state,
  ) as states.WaitForDirectFunding;
  // Funding events currently occur directly against the ledger channel
  if (!isFundingAction(action) || action.channelId !== indirectFundingState.ledgerId) {
    return state;
  } else {
    let newState = updateDirectFundingStatus(state, action);
    if (directFundingIsComplete(newState, action.channelId)) {
      newState = createAndSendPostFundCommitment(newState, action.channelId);
      newState.indirectFunding = states.waitForPostFundSetup1(indirectFundingState);
    }
    return newState;
  }
};

const waitForPreFundSetup1Reducer = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const indirectFundingState = selectors.getIndirectFundingState(
        state,
      ) as states.WaitForPostFundSetup1;
      let newState = { ...state };
      newState = receiveLedgerCommitment(newState, action.commitment, action.signature);
      if (appChannelIsWaitingForFunding(newState, indirectFundingState.channelId)) {
        newState = requestDirectFunding(newState, indirectFundingState.ledgerId);
        newState.indirectFunding = states.waitForDirectFunding(indirectFundingState);
      }
      return newState;
    default:
      return state;
  }
};

const waitForApprovalReducer = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  switch (action.type) {
    case actions.indirectFunding.playerA.FUNDING_APPROVED:
      let newState = { ...state };

      const appChannelState = selectors.getOpenedChannelState(state, action.channelId);

      const { ledgerChannelState, preFundSetupMessage } = createLedgerChannel(
        state,
        appChannelState,
      );

      newState = walletStates.setChannel(newState, ledgerChannelState);
      newState = walletStates.queueMessage(newState, preFundSetupMessage);

      newState.indirectFunding = states.waitForPreFundSetup1({
        channelId: action.channelId,
        ledgerId: ledgerChannelState.channelId,
      });

      return newState;
    default:
      return state;
  }
};

const createLedgerChannel = (
  state: walletStates.Initialized,
  appChannelState: channelState.OpenedState,
): { ledgerChannelState: channelState.WaitForPreFundSetup; preFundSetupMessage: WalletEvent } => {
  // 1. Determine ledger channel properties
  const nonce = 4; // TODO: Make random
  const { participants, address, privateKey } = appChannelState;
  const channelType = state.consensusLibrary;
  const ledgerChannel: Channel = { channelType, nonce, participants };
  const ledgerChannelId = channelID(ledgerChannel);
  const { allocation, destination } = appChannelState.lastCommitment.commitment;

  // 2. Create preFundSetupMessage
  const preFundSetupCommitment = composePreFundCommitment(
    ledgerChannel,
    allocation,
    destination,
    appChannelState.ourIndex,
    appChannelState.privateKey,
  );

  // 3. Create the channel state
  const ledgerChannelState = waitForPreFundSetup({
    address,
    privateKey,
    channelId: ledgerChannelId,
    libraryAddress: channelType,
    ourIndex: 0,
    participants,
    channelNonce: nonce,
    turnNum: 0,
    lastCommitment: preFundSetupCommitment,
    funded: false,
  });

  const preFundSetupMessage = createCommitmentMessageRelay(
    appChannelState.participants[PlayerIndex.B],
    appChannelState.channelId,
    preFundSetupCommitment,
  );

  return { ledgerChannelState, preFundSetupMessage };
};

const ledgerChannelIsWaitingForUpdate = (
  state: walletStates.Initialized,
  ledgerChannelId: string,
): boolean => {
  const ledgerChannel = selectors.getOpenedChannelState(state, ledgerChannelId);
  return ledgerChannel.type === channelStates.WAIT_FOR_UPDATE;
};

const ledgerChannelFundsAppChannel = (
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
  return bigNumberify(allocation[indexOfTargetChannel]).gte(appChannelTotal);
};

const directFundingIsComplete = (state: walletStates.Initialized, channelId: string): boolean => {
  const fundingStatus = selectors.getDirectFundingState(state, channelId);
  return fundingStatus.channelFundingStatus === CHANNEL_FUNDED;
};

const appChannelIsWaitingForFunding = (
  state: walletStates.Initialized,
  channelId: string,
): boolean => {
  const appChannel = selectors.getOpenedChannelState(state, channelId);
  return appChannel.type === channelState.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP;
};

const createAndSendUpdateCommitment = (
  state: walletStates.Initialized,
  appChannelId: string,
  ledgerChannelId: string,
): walletStates.Initialized => {
  const appChannelState = selectors.getOpenedChannelState(state, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];
  // Compose the update commitment
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const signedCommitment = composeLedgerUpdateCommitment(
    ledgerChannelState.lastCommitment.commitment,
    ledgerChannelState.ourIndex,
    proposedAllocation,
    proposedDestination,
    ledgerChannelState.privateKey,
  );

  // Update our ledger channel with the latest commitment
  const newState = receiveOwnLedgerCommitment(state, signedCommitment.commitment);

  // Send out the commitment to the opponent
  newState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      ledgerChannelState.participants[PlayerIndex.B],
      appChannelId,
      signedCommitment,
    ),
  ];
  return newState;
};

const createAndSendPostFundCommitment = (
  state: walletStates.Initialized,
  ledgerChannelId: string,
): walletStates.Initialized => {
  let newState = { ...state };
  const ledgerChannelState = selectors.getOpenedChannelState(newState, ledgerChannelId);
  const signedCommitment = composePostFundCommitment(
    ledgerChannelState.lastCommitment.commitment,
    ledgerChannelState.ourIndex,
    ledgerChannelState.privateKey,
  );

  newState = receiveOwnLedgerCommitment(state, signedCommitment.commitment);

  newState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      ledgerChannelState.participants[PlayerIndex.B],
      ledgerChannelId,
      signedCommitment,
    ),
  ];
  return newState;
};

const requestDirectFunding = (
  state: walletStates.Initialized,
  ledgerChannelId: string,
): walletStates.Initialized => {
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const { ourIndex } = ledgerChannelState;
  const { allocation } = ledgerChannelState.lastCommitment.commitment;
  const safeToDeposit = ourIndex === PlayerIndex.A ? '0x0' : allocation[0];
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

const confirmFundingForAppChannel = (
  state: walletStates.Initialized,
  channelId: string,
): walletStates.Initialized => {
  return updateChannelState(state, actions.internal.fundingConfirmed(channelId));
};

const receiveLedgerCommitment = (
  state: walletStates.Initialized,
  commitment: Commitment,
  signature: string,
): walletStates.Initialized => {
  return updateChannelState(
    state,
    channelActions.opponentCommitmentReceived(commitment, signature),
  );
};

const receiveOwnLedgerCommitment = (
  state: walletStates.Initialized,
  commitment: Commitment,
): walletStates.Initialized => {
  return updateChannelState(state, channelActions.ownCommitmentReceived(commitment));
};

export const createCommitmentMessageRelay = (
  to: string,
  channelId: string,
  signedCommitment: SignedCommitment,
) => {
  const payload = {
    channelId,
    procedure: WalletProcedure.IndirectFunding,
    data: signedCommitment,
  };
  return messageRelayRequested(to, payload);
};

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
  action: actions.funding.FundingAction,
): walletStates.Initialized => {
  const newState = { ...state };
  const updatedDirectFundingStore = directFundingStoreReducer(state.directFundingStore, action);
  newState.directFundingStore = updatedDirectFundingStore.state;
  return newState;
};
