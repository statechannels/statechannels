import * as states from './state';
import * as walletStates from '../../state';
import * as channelState from '../../channel-state/state';

import * as actions from '../../actions';

import * as selectors from '../../selectors';

import { unreachable } from '../../../utils/reducer-utils';
import { PlayerIndex } from '../../types';

import { Channel } from 'fmg-core';
import { channelID } from 'magmo-wallet-client/node_modules/fmg-core/lib/channel';
import { CHANNEL_FUNDED } from '../../direct-funding-store/direct-funding-state/state';
import {
  appChannelIsWaitingForFunding,
  updateDirectFundingStatus,
  receiveOpponentLedgerCommitment,
  safeToSendLedgerUpdate,
  createAndSendPostFundCommitment,
  ledgerChannelFundsAppChannel,
  confirmFundingForChannel,
  requestDirectFunding,
  createCommitmentMessageRelay,
  receiveOwnLedgerCommitment,
  receiveLedgerCommitment,
} from '../reducer-helpers';
import {
  composePreFundCommitment,
  composeLedgerUpdateCommitment,
} from '../../../utils/commitment-utils';
import { WalletEvent } from 'magmo-wallet-client';
import { isfundingAction } from '../../direct-funding-store/direct-funding-state/actions';
import { addHex } from '../../../utils/hex-utils';

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
      let newState = receiveOpponentLedgerCommitment(state, action.commitment, action.signature);
      newState = createAndSendFinalUpdateCommitment(
        state,
        indirectFundingState.channelId,
        indirectFundingState.ledgerId,
      );
      if (
        ledgerChannelFundsAppChannel(
          newState,
          indirectFundingState.channelId,
          indirectFundingState.ledgerId,
        )
      ) {
        newState = confirmFundingForChannel(newState, indirectFundingState.channelId);
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

      let newState = receiveLedgerCommitment(state, action);

      if (safeToSendLedgerUpdate(newState, indirectFundingState.ledgerId)) {
        newState = createAndSendFirstUpdateCommitment(
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
  if (!isfundingAction(action)) {
    return state;
  } else {
    let newState = updateDirectFundingStatus(state, action);
    if (directFundingIsComplete(newState, indirectFundingState.ledgerId)) {
      newState = confirmFundingForChannel(state, indirectFundingState.ledgerId);
      newState = createAndSendPostFundCommitment(newState, indirectFundingState.ledgerId);
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
      newState = receiveOpponentLedgerCommitment(newState, action.commitment, action.signature);
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
    case actions.indirectFunding.playerA.STRATEGY_APPROVED:
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

const directFundingIsComplete = (state: walletStates.Initialized, channelId: string): boolean => {
  const fundingStatus = selectors.getDirectFundingState(state, channelId);
  return fundingStatus.channelFundingStatus === CHANNEL_FUNDED;
};

const createAndSendFinalUpdateCommitment = (
  state: walletStates.Initialized,
  appChannelId: string,
  ledgerChannelId: string,
): walletStates.Initialized => {
  const appChannelState = selectors.getOpenedChannelState(state, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const { channel } = ledgerChannelState.lastCommitment.commitment;
  const { commitment, signature } = composeLedgerUpdateCommitment(
    channel,
    ledgerChannelState.turnNum + 1,
    ledgerChannelState.ourIndex,
    proposedAllocation,
    proposedDestination,
    proposedAllocation,
    proposedDestination,
    ledgerChannelState.privateKey,
  );

  // Update our ledger channel with the latest commitment
  const newState = receiveOwnLedgerCommitment(state, commitment);

  // Send out the commitment to the opponent
  newState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      ledgerChannelState.participants[PlayerIndex.B],
      appChannelId,
      commitment,
      signature,
    ),
  ];
  return newState;
};

const createAndSendFirstUpdateCommitment = (
  state: walletStates.Initialized,
  appChannelId: string,
  ledgerChannelId: string,
): walletStates.Initialized => {
  const appChannelState = selectors.getOpenedChannelState(state, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];
  // Compose the update commitment
  const ledgerChannelState = selectors.getOpenedChannelState(state, ledgerChannelId);
  const { channel, allocation, destination } = ledgerChannelState.lastCommitment.commitment;
  const { commitment, signature } = composeLedgerUpdateCommitment(
    channel,
    ledgerChannelState.turnNum + 1,
    ledgerChannelState.ourIndex,
    proposedAllocation,
    proposedDestination,
    allocation,
    destination,
    ledgerChannelState.privateKey,
  );

  // Update our ledger channel with the latest commitment
  const newState = receiveOwnLedgerCommitment(state, commitment);

  // Send out the commitment to the opponent
  newState.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      ledgerChannelState.participants[PlayerIndex.B],
      appChannelId,
      commitment,
      signature,
    ),
  ];
  return newState;
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
  const ledgerChannelState = channelState.waitForPreFundSetup({
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

  const { commitment, signature } = preFundSetupCommitment;
  const preFundSetupMessage = createCommitmentMessageRelay(
    appChannelState.participants[PlayerIndex.B],
    appChannelState.channelId,
    commitment,
    signature,
  );

  return { ledgerChannelState, preFundSetupMessage };
};
