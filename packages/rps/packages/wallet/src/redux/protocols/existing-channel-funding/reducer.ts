import {
  SharedData,
  signAndStore,
  queueMessage,
  checkAndStore,
  getExistingChannel,
} from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData } from '..';
import { ExistingChannelFundingAction } from './actions';
import * as helpers from '../reducer-helpers';
import * as selectors from '../../selectors';
import { proposeNewConsensus, acceptConsensus } from '../../../domain/two-player-consensus-game';
import { theirAddress, getLastCommitment } from '../../channel-store';
import { Commitment, nextSetupCommitment } from '../../../domain';
import { bigNumberify } from 'ethers/utils';
import { sendCommitmentReceived } from '../../../communication';
import { CommitmentType } from 'fmg-core';
import { initialize as initializeLedgerTopUp, ledgerTopUpReducer } from '../ledger-top-up/reducer';
import { isLedgerTopUpAction } from '../ledger-top-up/actions';
export const EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR = 'ExistingChannelFunding';
export const initialize = (
  processId: string,
  channelId: string,
  ledgerId: string,
  proposedTotal: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.ExistingChannelFundingState> => {
  const ledgerChannel = selectors.getChannelState(sharedData, ledgerId);
  const theirCommitment = getLastCommitment(ledgerChannel);
  if (ledgerChannelNeedsTopUp(theirCommitment, proposedTotal)) {
    const amountRequiredFromEachParticipant = bigNumberify(proposedTotal)
      .div(theirCommitment.channel.participants.length)
      .toHexString();

    const { protocolState: ledgerTopUpState, sharedData: newSharedData } = initializeLedgerTopUp(
      processId,
      channelId,
      ledgerId,
      [amountRequiredFromEachParticipant, amountRequiredFromEachParticipant],
      theirCommitment.destination,
      sharedData,
    );
    return {
      protocolState: states.waitForLedgerTopUp({
        ledgerTopUpState,
        processId,
        channelId,
        ledgerId,
        proposedAmount: proposedTotal,
      }),
      sharedData: newSharedData,
    };
  }

  if (helpers.isFirstPlayer(ledgerId, sharedData)) {
    const { proposedAllocation, proposedDestination } = craftNewAllocationAndDestination(
      theirCommitment,
      proposedTotal,
      channelId,
    );
    const ourCommitment = proposeNewConsensus(
      theirCommitment,
      proposedAllocation,
      proposedDestination,
    );
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return {
        protocolState: states.failure({ reason: 'ReceivedInvalidCommitment' }),
        sharedData,
      };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      theirAddress(ledgerChannel),
      processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }

  const protocolState = states.waitForLedgerUpdate({
    processId,
    ledgerId,
    channelId,
    proposedAmount: proposedTotal,
  });

  return { protocolState, sharedData };
};

export const existingChannelFundingReducer = (
  protocolState: states.ExistingChannelFundingState,
  sharedData: SharedData,
  action: ExistingChannelFundingAction,
): ProtocolStateWithSharedData<states.ExistingChannelFundingState> => {
  switch (protocolState.type) {
    case 'ExistingChannelFunding.WaitForLedgerUpdate':
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    case 'ExistingChannelFunding.WaitForPostFundSetup':
      return waitForPostFundSetupReducer(protocolState, sharedData, action);
    case 'ExistingChannelFunding.WaitForLedgerTopUp':
      return waitForLedgerTopUpReducer(protocolState, sharedData, action);
  }
  return { protocolState, sharedData };
};

const waitForLedgerTopUpReducer = (
  protocolState: states.WaitForLedgerTopUp,
  sharedData: SharedData,
  action: ExistingChannelFundingAction,
): ProtocolStateWithSharedData<states.ExistingChannelFundingState> => {
  if (!isLedgerTopUpAction(action)) {
    console.warn(`Expected a ledger top up action.`);
  }
  const { protocolState: ledgerTopUpState, sharedData: newSharedData } = ledgerTopUpReducer(
    protocolState.ledgerTopUpState,
    sharedData,
    action,
  );
  sharedData = newSharedData;

  if (ledgerTopUpState.type === 'LedgerTopUp.Failure') {
    return {
      protocolState: states.failure({ reason: 'LedgerTopUpFailure' }),
      sharedData,
    };
  } else if (ledgerTopUpState.type === 'LedgerTopUp.Success') {
    const { ledgerId, proposedAmount, channelId, processId } = protocolState;
    const ledgerChannel = selectors.getChannelState(sharedData, ledgerId);
    const theirCommitment = getLastCommitment(ledgerChannel);
    if (helpers.isFirstPlayer(ledgerId, sharedData)) {
      const { proposedAllocation, proposedDestination } = craftNewAllocationAndDestination(
        theirCommitment,
        proposedAmount,
        channelId,
      );
      const ourCommitment = proposeNewConsensus(
        theirCommitment,
        proposedAllocation,
        proposedDestination,
      );
      const signResult = signAndStore(sharedData, ourCommitment);
      if (!signResult.isSuccess) {
        return {
          protocolState: states.failure({ reason: 'ReceivedInvalidCommitment' }),
          sharedData,
        };
      }
      sharedData = signResult.store;

      const messageRelay = sendCommitmentReceived(
        theirAddress(ledgerChannel),
        processId,
        signResult.signedCommitment.commitment,
        signResult.signedCommitment.signature,
        EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
      );
      sharedData = queueMessage(sharedData, messageRelay);
    }

    return {
      protocolState: states.waitForLedgerUpdate(protocolState),
      sharedData,
    };
  } else {
    return {
      protocolState: states.waitForLedgerTopUp({ ...protocolState, ledgerTopUpState }),
      sharedData,
    };
  }
};

const waitForPostFundSetupReducer = (
  protocolState: states.WaitForPostFundSetup,
  sharedData: SharedData,
  action: ExistingChannelFundingAction,
) => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    throw new Error(`Invalid action ${action.type}`);
  }

  let newSharedData = { ...sharedData };

  const checkResult = checkAndStore(newSharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    return {
      protocolState: states.failure({ reason: 'ReceivedInvalidCommitment' }),
      sharedData,
    };
  }
  newSharedData = checkResult.store;

  if (!helpers.isFirstPlayer(protocolState.channelId, newSharedData)) {
    try {
      newSharedData = craftAndSendAppPostFundCommitment(
        newSharedData,
        protocolState.channelId,
        protocolState.processId,
      );
    } catch (error) {
      return {
        protocolState: states.failure({ reason: 'PostFundSetupFailure' }),
        sharedData,
      };
    }
  }

  return { protocolState: states.success({}), sharedData: newSharedData };
};

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: ExistingChannelFundingAction,
) => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    return { protocolState, sharedData };
  }
  const { ledgerId, processId } = protocolState;
  let newSharedData = { ...sharedData };
  const ledgerChannel = selectors.getChannelState(sharedData, ledgerId);
  const theirCommitment = action.signedCommitment.commitment;

  const checkResult = checkAndStore(newSharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    return {
      protocolState: states.failure({ reason: 'ReceivedInvalidCommitment' }),
      sharedData,
    };
  }
  newSharedData = checkResult.store;
  if (helpers.isFirstPlayer(protocolState.ledgerId, newSharedData)) {
    try {
      newSharedData = craftAndSendAppPostFundCommitment(
        newSharedData,
        protocolState.channelId,
        protocolState.processId,
      );
    } catch (error) {
      return {
        protocolState: states.failure({ reason: 'PostFundSetupFailure' }),
        sharedData,
      };
    }
  } else {
    const ourCommitment = acceptConsensus(theirCommitment);
    const signResult = signAndStore(newSharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return {
        protocolState: states.failure({ reason: 'ReceivedInvalidCommitment' }),
        sharedData,
      };
    }
    newSharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      theirAddress(ledgerChannel),
      processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
    );
    newSharedData = queueMessage(newSharedData, messageRelay);
  }

  return { protocolState: states.waitForPostFundSetup(protocolState), sharedData: newSharedData };
};

function craftNewAllocationAndDestination(
  latestCommitment: Commitment,
  proposedAmount: string,
  channelId: string,
): { proposedAllocation: string[]; proposedDestination: string[] } {
  const numParticipants = helpers.getNumberOfParticipants(latestCommitment);
  const amountRequiredFromEachParticipant = bigNumberify(proposedAmount).div(numParticipants);

  const proposedAllocation: string[] = [];
  const proposedDestination: string[] = [];

  for (let i = 0; i < latestCommitment.allocation.length; i++) {
    const allocation = latestCommitment.allocation[i];

    const newAmount = bigNumberify(allocation).sub(amountRequiredFromEachParticipant);

    if (newAmount.gt('0x0')) {
      proposedAllocation.push(newAmount.toHexString());
      proposedDestination.push(latestCommitment.destination[i]);
    }
  }

  proposedAllocation.push(proposedAmount);
  proposedDestination.push(channelId);

  return { proposedAllocation, proposedDestination };
}

function ledgerChannelNeedsTopUp(latestCommitment: Commitment, proposedAmount: string) {
  if (latestCommitment.commitmentType !== CommitmentType.App) {
    throw new Error('Ledger channel is already closed.');
  }
  const numParticipants = helpers.getNumberOfParticipants(latestCommitment);
  const amountRequiredFromEachParticipant = bigNumberify(proposedAmount).div(numParticipants);

  return !latestCommitment.allocation.every(a =>
    bigNumberify(a).gte(amountRequiredFromEachParticipant),
  );
}

function craftAndSendAppPostFundCommitment(
  sharedData: SharedData,
  appChannelId: string,
  processId: string,
): SharedData {
  let newSharedData = { ...sharedData };
  const appChannel = getExistingChannel(sharedData, appChannelId);

  const theirAppCommitment = getLastCommitment(appChannel);

  const ourAppCommitment = nextSetupCommitment(theirAppCommitment);
  if (ourAppCommitment === 'NotASetupCommitment') {
    throw new Error('NotASetupCommitment');
  }
  const signResult = signAndStore(newSharedData, ourAppCommitment);
  if (!signResult.isSuccess) {
    throw new Error('CouldNotSign');
  }
  newSharedData = signResult.store;

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(appChannel),
    processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
    EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
  );
  newSharedData = queueMessage(newSharedData, messageRelay);
  return newSharedData;
}
