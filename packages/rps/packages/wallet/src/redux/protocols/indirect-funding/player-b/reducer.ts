import * as states from './state';

import * as actions from '../../../actions';

import { unreachable } from '../../../../utils/reducer-utils';
import { channelID } from 'fmg-core/lib/channel';

import {
  appChannelIsWaitingForFunding,
  receiveOpponentLedgerCommitment,
  safeToSendLedgerUpdate,
  createAndSendUpdateCommitment,
  ledgerChannelFundsAppChannel,
  confirmFundingForChannel,
  receiveLedgerCommitment,
  updateDirectFundingStatus,
  requestDirectFunding,
  receiveOwnLedgerCommitment,
  createCommitmentMessageRelay,
  initializeChannelState,
  queueMessage,
  directFundingIsComplete,
} from '../reducer-helpers';
import { ProtocolStateWithSharedData, SharedData } from '../../';
import { FundingAction, isfundingAction } from '../../direct-funding/actions';
import * as channelState from '../../../channel-state/state';
import { Commitment } from 'fmg-core/lib/commitment';
import { composePreFundCommitment } from '../../../../utils/commitment-utils';
import { PlayerIndex } from '../../../types';
import * as selectors from '../../../selectors';

export function playerBReducer(
  protocolState: states.PlayerBState,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> {
  switch (protocolState.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApproval(protocolState, sharedData, action);
    case states.WAIT_FOR_PRE_FUND_SETUP_0:
      return waitForPreFundSetup0(protocolState, sharedData, action);
    case states.WAIT_FOR_DIRECT_FUNDING:
      return waitForDirectFunding(protocolState, sharedData, action);
    case states.WAIT_FOR_POST_FUND_SETUP_0:
      return waitForPostFundSetup0(protocolState, sharedData, action);
    case states.WAIT_FOR_LEDGER_UPDATE_0:
      return waitForLedgerUpdate0(protocolState, sharedData, action);
    case states.WAIT_FOR_CONSENSUS:
      return waitForConsensus(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

const waitForApproval = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.indirectFunding.playerB.STRATEGY_PROPOSED:
      return { protocolState: states.waitForPreFundSetup0(protocolState), sharedData };
    default:
      return { protocolState, sharedData };
  }
};

const waitForPreFundSetup0 = (
  protocolState: states.WaitForPreFundSetup0,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment, signature } = action;

      let newSharedData = createLedgerChannel(
        protocolState.channelId,
        sharedData,
        commitment,
        signature,
      );
      newSharedData = respondWithPreFundSetup(protocolState.channelId, commitment, newSharedData);

      const ledgerId = channelID(commitment.channel);
      if (appChannelIsWaitingForFunding(newSharedData, protocolState.channelId)) {
        return startDirectFunding(protocolState, ledgerId, newSharedData);
      }

      return { protocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};

const waitForDirectFunding = (
  protocolState: states.WaitForDirectFunding,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  if (!isfundingAction(action)) {
    return { sharedData, protocolState };
  } else {
    const updatedStateAndSharedData = updateStateWithDirectFundingAction(
      action,
      protocolState,
      sharedData,
    );

    let newSharedData = updatedStateAndSharedData.sharedData;
    let newProtocolState: states.PlayerBState = updatedStateAndSharedData.protocolState;

    if (directFundingIsComplete(newProtocolState.directFundingState)) {
      newSharedData = confirmFundingForChannel(newSharedData, protocolState.channelId);
      newProtocolState = states.waitForPostFundSetup0(updatedStateAndSharedData.protocolState);
      return { protocolState: newProtocolState, sharedData: newSharedData };
    } else {
      return { sharedData, protocolState: newProtocolState };
    }
  }
};

const waitForPostFundSetup0 = (
  protocolState: states.WaitForPostFundSetup0,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      // The ledger channel is in the `FUNDING` stage, so we have to use the
      // `receiveLedgerCommitment` helper and not the `receiveOpponentLedgerCommitment`
      // helper
      // Note that the channelStateReducer currently sends the post fund setup message
      const newSharedData = receiveLedgerCommitment(sharedData, action);
      const newProtocolState = states.waitForLedgerUpdate0(protocolState);
      return { protocolState: newProtocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};

const waitForLedgerUpdate0 = (
  protocolState: states.WaitForLedgerUpdate0,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      let newSharedData = receiveOpponentLedgerCommitment(
        sharedData,
        action.commitment,
        action.signature,
      );
      if (safeToSendLedgerUpdate(newSharedData, protocolState.ledgerId)) {
        newSharedData = createAndSendUpdateCommitment(
          newSharedData,
          protocolState.channelId,
          protocolState.ledgerId,
        );
        const newProtocolState = states.waitForConsensus(protocolState);
        return { protocolState: newProtocolState, sharedData: newSharedData };
      }
      return { protocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};
const waitForConsensus = (
  protocolState: states.WaitForConsensus,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      let newSharedData = receiveOpponentLedgerCommitment(
        sharedData,
        action.commitment,
        action.signature,
      );
      if (
        ledgerChannelFundsAppChannel(newSharedData, protocolState.channelId, protocolState.ledgerId)
      ) {
        newSharedData = confirmFundingForChannel(newSharedData, protocolState.channelId);
      }
      return { protocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
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
  const newProtocolState: states.PlayerBState = states.waitForDirectFunding({
    ...protocolState,
    directFundingState: directFundingResult.protocolState,
  });
  return { protocolState: newProtocolState, sharedData: newSharedData };
};

const startDirectFunding = (
  protocolState: states.WaitForPreFundSetup0,
  ledgerId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.WaitForDirectFunding> => {
  const {
    protocolState: directFundingProtocolState,
    sharedData: updatedSharedData,
  } = requestDirectFunding(sharedData, ledgerId);

  const newProtocolState = states.waitForDirectFunding({
    ...protocolState,
    ledgerId,
    directFundingState: directFundingProtocolState,
  });
  return { protocolState: newProtocolState, sharedData: updatedSharedData };
};

const createLedgerChannel = (
  appChannelId: string,
  sharedData: SharedData,
  incomingCommitment: Commitment,
  incomingSignature: string,
): SharedData => {
  const appChannelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const { address, privateKey } = appChannelState;
  const { channel } = incomingCommitment;

  const ledgerChannelId = channelID(channel);

  const newChannelState = channelState.waitForPreFundSetup({
    address,
    privateKey,
    channelId: ledgerChannelId,
    libraryAddress: channel.channelType,
    ourIndex: 1,
    participants: channel.participants as [string, string],
    channelNonce: channel.nonce,
    turnNum: 1,
    lastCommitment: { commitment: incomingCommitment, signature: incomingSignature },
    funded: false,
  });

  return initializeChannelState(sharedData, newChannelState);
};

const respondWithPreFundSetup = (
  appChannelId: string,
  incomingCommitment: Commitment,
  sharedData: SharedData,
): SharedData => {
  const appChannelState = selectors.getOpenedChannelState(sharedData, appChannelId);
  const { channel, allocation, destination } = incomingCommitment;
  // Create the commitment
  const preFundSetupCommitment = composePreFundCommitment(
    channel,
    allocation,
    destination,
    appChannelState.ourIndex,
    appChannelState.privateKey,
  );
  const { commitment, signature } = preFundSetupCommitment;

  // Update ledger channel state with commitment.
  const newSharedData = receiveOwnLedgerCommitment(sharedData, commitment);

  // Send the message to the opponent.
  const preFundSetupMessage = createCommitmentMessageRelay(
    appChannelState.participants[PlayerIndex.B],
    appChannelState.channelId,
    commitment,
    signature,
  );
  return queueMessage(newSharedData, preFundSetupMessage);
};
