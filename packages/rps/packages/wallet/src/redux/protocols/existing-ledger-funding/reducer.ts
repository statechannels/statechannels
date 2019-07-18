import {
  SharedData,
  signAndStore,
  queueMessage,
  checkAndStore,
  ChannelFundingState,
  setFundingState,
} from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData, makeLocator } from '..';
import { ExistingLedgerFundingAction } from './actions';
import * as helpers from '../reducer-helpers';
import * as selectors from '../../selectors';
import { proposeNewConsensus, acceptConsensus } from '../../../domain/consensus-app';
import { theirAddress, getLastCommitment } from '../../channel-store';
import { Commitment } from '../../../domain';
import { bigNumberify } from 'ethers/utils';
import { sendCommitmentReceived, EmbeddedProtocol } from '../../../communication';
import { CommitmentType } from 'fmg-core';
import { initialize as initializeLedgerTopUp, ledgerTopUpReducer } from '../ledger-top-up/reducer';
import { isLedgerTopUpAction } from '../ledger-top-up/actions';
import { addHex } from '../../../utils/hex-utils';
export const EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR = makeLocator(
  EmbeddedProtocol.ExistingLedgerFunding,
);

export const initialize = (
  processId: string,
  channelId: string,
  ledgerId: string,
  targetAllocation: string[],
  targetDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.NonTerminalExistingLedgerFundingState | states.Failure> => {
  const ledgerChannel = selectors.getChannelState(sharedData, ledgerId);
  const theirCommitment = getLastCommitment(ledgerChannel);

  if (ledgerChannelNeedsTopUp(theirCommitment, targetAllocation, targetDestination)) {
    const { protocolState: ledgerTopUpState, sharedData: newSharedData } = initializeLedgerTopUp(
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      theirCommitment.allocation,
      sharedData,
    );
    return {
      protocolState: states.waitForLedgerTopUp({
        ledgerTopUpState,
        processId,
        channelId,
        ledgerId,
        targetAllocation,
        targetDestination,
      }),
      sharedData: newSharedData,
    };
  }

  if (helpers.isFirstPlayer(ledgerId, sharedData)) {
    const appFunding = craftAppFunding(sharedData, channelId);
    const ourCommitment = proposeNewConsensus(
      theirCommitment,
      appFunding.proposedAllocation,
      appFunding.proposedDestination,
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
      EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }

  const protocolState = states.waitForLedgerUpdate({
    processId,
    ledgerId,
    channelId,
    targetAllocation,
    targetDestination,
  });

  return { protocolState, sharedData };
};

export const existingLedgerFundingReducer = (
  protocolState: states.ExistingLedgerFundingState,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction,
): ProtocolStateWithSharedData<states.ExistingLedgerFundingState> => {
  switch (protocolState.type) {
    case 'ExistingLedgerFunding.WaitForLedgerUpdate':
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    case 'ExistingLedgerFunding.WaitForLedgerTopUp':
      return waitForLedgerTopUpReducer(protocolState, sharedData, action);
  }
  return { protocolState, sharedData };
};

const waitForLedgerTopUpReducer = (
  protocolState: states.WaitForLedgerTopUp,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction,
): ProtocolStateWithSharedData<states.ExistingLedgerFundingState> => {
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
    const { ledgerId, processId } = protocolState;
    const ledgerChannel = selectors.getChannelState(sharedData, ledgerId);
    const theirCommitment = getLastCommitment(ledgerChannel);

    if (helpers.isFirstPlayer(ledgerId, sharedData)) {
      const appFunding = craftAppFunding(sharedData, protocolState.channelId);
      const ourCommitment = proposeNewConsensus(
        theirCommitment,
        appFunding.proposedAllocation,
        appFunding.proposedDestination,
      );
      const signResult = signAndStore(sharedData, ourCommitment);
      if (!signResult.isSuccess) {
        return {
          protocolState: states.failure({
            reason: 'ReceivedInvalidCommitment',
          }),
          sharedData,
        };
      }
      sharedData = signResult.store;

      const messageRelay = sendCommitmentReceived(
        theirAddress(ledgerChannel),
        processId,
        signResult.signedCommitment.commitment,
        signResult.signedCommitment.signature,
        EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
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

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction,
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
  if (!helpers.isFirstPlayer(protocolState.ledgerId, newSharedData)) {
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
      EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
    );
    newSharedData = queueMessage(newSharedData, messageRelay);
  }
  const fundingState: ChannelFundingState = {
    directlyFunded: false,
    fundingChannel: protocolState.ledgerId,
  };

  newSharedData = setFundingState(newSharedData, protocolState.channelId, fundingState);

  return { protocolState: states.success({}), sharedData: newSharedData };
};

function ledgerChannelNeedsTopUp(
  latestCommitment: Commitment,
  proposedAllocation: string[],
  proposedDestination: string[],
) {
  if (latestCommitment.commitmentType !== CommitmentType.App) {
    throw new Error('Ledger channel is already closed.');
  }
  // We assume that destination/allocation are the same length and destination contains the same addresses
  // Otherwise we shouldn't be in this protocol at all
  for (let i = 0; i < proposedDestination.length; i++) {
    const address = proposedDestination[i];
    const existingIndex = latestCommitment.destination.indexOf(address);
    if (
      existingIndex > -1 &&
      bigNumberify(latestCommitment.allocation[existingIndex]).lt(proposedAllocation[i])
    ) {
      return true;
    }
  }
  return false;
}
function craftAppFunding(
  sharedData: SharedData,
  appChannelId: string,
): { proposedAllocation: string[]; proposedDestination: string[] } {
  const commitment = helpers.getLatestCommitment(appChannelId, sharedData);
  const total = commitment.allocation.reduce(addHex);
  return {
    proposedAllocation: [total],
    proposedDestination: [appChannelId],
  };
}
