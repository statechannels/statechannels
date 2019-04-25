import * as states from './state';
import * as channelState from '../../../channel-store/state';

import * as actions from '../../../actions';

import * as selectors from '../../../selectors';

import { unreachable } from '../../../../utils/reducer-utils';
import { PlayerIndex } from '../../../types';

import { Channel } from 'fmg-core';
import { channelID } from 'magmo-wallet-client/node_modules/fmg-core/lib/channel';
import {
  appChannelIsWaitingForFunding,
  receiveOpponentLedgerCommitment,
  safeToSendLedgerUpdate,
  createAndSendPostFundCommitment,
  ledgerChannelFundsAppChannel,
  confirmFundingForChannel,
  createCommitmentMessageRelay,
  receiveOwnLedgerCommitment,
  receiveLedgerCommitment,
  queueMessage,
  initializeChannelState,
  updateDirectFundingStatus,
  requestDirectFunding,
  directFundingIsComplete,
} from '../reducer-helpers';
import {
  composePreFundCommitment,
  composeLedgerUpdateCommitment,
} from '../../../../utils/commitment-utils';
import { WalletEvent } from 'magmo-wallet-client';
import { isDirectFundingAction, FundingAction } from '../../direct-funding/actions';
import { addHex } from '../../../../utils/hex-utils';
import { ProtocolStateWithSharedData } from '../../';
import { SharedData } from '../../../state';

export function initialize(
  channelId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.WaitForApproval> {
  return { protocolState: states.waitForApproval({ channelId }), sharedData };
}

export function playerAReducer(
  protocolState: states.PlayerAState,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerAState> {
  switch (protocolState.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApprovalReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_PRE_FUND_SETUP_1:
      return waitForPreFundSetup1Reducer(protocolState, sharedData, action);
    case states.WAIT_FOR_DIRECT_FUNDING:
      return waitForDirectFunding(protocolState, sharedData, action);
    case states.WAIT_FOR_POST_FUND_SETUP_1:
      return waitForPostFundSetup1Reducer(protocolState, sharedData, action);
    case states.WAIT_FOR_LEDGER_UPDATE_1:
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate1,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerAState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      // Update ledger state
      let newSharedData = receiveOpponentLedgerCommitment(
        sharedData,
        action.commitment,
        action.signature,
      );
      newSharedData = createAndSendFinalUpdateCommitment(
        newSharedData,
        protocolState.channelId,
        protocolState.ledgerId,
      );
      if (
        ledgerChannelFundsAppChannel(newSharedData, protocolState.channelId, protocolState.ledgerId)
      ) {
        newSharedData = confirmFundingForChannel(newSharedData, protocolState.channelId);
      }
      return { protocolState, sharedData: newSharedData };
    default:
      return { sharedData, protocolState };
  }
};

const waitForPostFundSetup1Reducer = (
  protocolState: states.WaitForPostFundSetup1,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerAState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      let newSharedData = receiveLedgerCommitment(sharedData, action);

      if (safeToSendLedgerUpdate(newSharedData, protocolState.ledgerId)) {
        newSharedData = createAndSendFirstUpdateCommitment(
          newSharedData,
          protocolState.channelId,
          protocolState.ledgerId,
        );
        const newProtocolState = states.waitForLedgerUpdate1(protocolState);
        return { protocolState: newProtocolState, sharedData: newSharedData };
      }

      return { protocolState, sharedData: newSharedData };

    default:
      return { sharedData, protocolState };
  }
};

const waitForDirectFunding = (
  protocolState: states.WaitForDirectFunding,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerAState> => {
  // Funding events currently occur directly against the ledger channel
  if (!isDirectFundingAction(action)) {
    return { sharedData, protocolState };
  } else {
    const updatedStateAndSharedData = updateStateWithDirectFundingAction(
      action,
      protocolState,
      sharedData,
    );

    let newSharedData = updatedStateAndSharedData.sharedData;
    let newProtocolState: states.PlayerAState = updatedStateAndSharedData.protocolState;

    if (directFundingIsComplete(newProtocolState.directFundingState)) {
      newSharedData = confirmFundingForChannel(sharedData, protocolState.ledgerId);
      newSharedData = createAndSendPostFundCommitment(newSharedData, protocolState.ledgerId);
      newProtocolState = states.waitForPostFundSetup1(newProtocolState);
      return { protocolState: newProtocolState, sharedData: newSharedData };
    } else {
      return { sharedData, protocolState: newProtocolState };
    }
  }
};

const waitForPreFundSetup1Reducer = (
  protocolState: states.WaitForPreFundSetup1,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerAState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const newSharedData = receiveOpponentLedgerCommitment(
        sharedData,
        action.commitment,
        action.signature,
      );

      if (appChannelIsWaitingForFunding(newSharedData, protocolState.channelId)) {
        return startDirectFunding(protocolState, newSharedData);
      }
      return { protocolState, sharedData: newSharedData };
    default:
      return { sharedData, protocolState };
  }
};

const waitForApprovalReducer = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerAState> => {
  switch (action.type) {
    case actions.indirectFunding.playerA.STRATEGY_APPROVED:
      const appChannelState = selectors.getOpenedChannelState(sharedData, action.channelId);

      const { ledgerChannelState, preFundSetupMessage } = createLedgerChannel(
        action.consensusLibrary,
        appChannelState,
      );
      let newSharedData = initializeChannelState(sharedData, ledgerChannelState);
      newSharedData = queueMessage(newSharedData, preFundSetupMessage);

      const newProtocolState = states.waitForPreFundSetup1({
        channelId: protocolState.channelId,
        ledgerId: ledgerChannelState.channelId,
      });

      return { protocolState: newProtocolState, sharedData: newSharedData };
    default:
      return { sharedData, protocolState };
  }
};

const updateStateWithDirectFundingAction = (
  action: FundingAction,
  protocolState: states.WaitForDirectFunding,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.WaitForDirectFunding> => {
  const directFundingResult = updateDirectFundingStatus(
    protocolState.directFundingState,
    sharedData,
    action,
  );
  const newSharedData = directFundingResult.sharedData;
  const newProtocolState: states.PlayerAState = states.waitForDirectFunding({
    ...protocolState,
    directFundingState: directFundingResult.protocolState,
  });
  return { protocolState: newProtocolState, sharedData: newSharedData };
};

const startDirectFunding = (
  protocolState: states.WaitForPreFundSetup1,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.WaitForDirectFunding> => {
  // TODO: indirect funding state should store the processId
  const {
    protocolState: directFundingProtocolState,
    sharedData: updatedSharedData,
  } = requestDirectFunding(
    `processId:${protocolState.channelId}`,
    sharedData,
    protocolState.ledgerId,
  );
  const newProtocolState = states.waitForDirectFunding({
    ...protocolState,
    directFundingState: directFundingProtocolState,
  });
  return { protocolState: newProtocolState, sharedData: updatedSharedData };
};

const createAndSendFinalUpdateCommitment = (
  sharedData: SharedData,
  appChannelId: string,
  ledgerChannelId: string,
): SharedData => {
  const appChannelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];
  const ledgerChannelState = selectors.getOpenedChannelState(sharedData, ledgerChannelId);
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
  const newSharedData = receiveOwnLedgerCommitment(sharedData, commitment);

  // Send out the commitment to the opponent
  newSharedData.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      ledgerChannelState.participants[PlayerIndex.B],
      appChannelId,
      commitment,
      signature,
    ),
  ];
  return newSharedData;
};

const createAndSendFirstUpdateCommitment = (
  sharedData: SharedData,
  appChannelId: string,
  ledgerChannelId: string,
): SharedData => {
  const appChannelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const proposedAllocation = [appChannelState.lastCommitment.commitment.allocation.reduce(addHex)];
  const proposedDestination = [appChannelState.channelId];
  // Compose the update commitment
  const ledgerChannelState = selectors.getOpenedChannelState(sharedData, ledgerChannelId);
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
  const newSharedData = receiveOwnLedgerCommitment(sharedData, commitment);

  // Send out the commitment to the opponent
  newSharedData.outboxState.messageOutbox = [
    createCommitmentMessageRelay(
      ledgerChannelState.participants[PlayerIndex.B],
      appChannelId,
      commitment,
      signature,
    ),
  ];
  return newSharedData;
};

const createLedgerChannel = (
  consensusLibrary: string,
  appChannelState: channelState.OpenedState,
): { ledgerChannelState: channelState.WaitForPreFundSetup; preFundSetupMessage: WalletEvent } => {
  // 1. Determine ledger channel properties
  const nonce = 4; // TODO: Make random
  const { participants, address, privateKey } = appChannelState;
  const channelType = consensusLibrary;
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
