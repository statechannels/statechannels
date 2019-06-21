import {
  SharedData,
  signAndStore,
  queueMessage,
  checkAndStore,
  registerChannelToMonitor,
  getExistingChannel,
} from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import * as helpers from '../reducer-helpers';
import { proposeNewConsensus, acceptConsensus } from '../../../domain';
import { TwoPartyPlayerIndex } from '../../types';
import { bigNumberify } from 'ethers/utils';
import { theirAddress, getLastCommitment } from '../../channel-store';
import { sendCommitmentReceived } from '../../../communication';
import {
  initialize as initializeDirectFunding,
  directFundingStateReducer,
} from '../direct-funding/reducer';
import { LedgerTopUpAction } from './actions';
import { directFundingRequested } from '../direct-funding/actions';
import { isTerminal, isFailure, isSuccess } from '../direct-funding/states';
import { addHex } from '../../../utils/hex-utils';
export const LEDGER_TOP_UP_PROTOCOL_LOCATOR = 'LedgerTopUp';
export function initialize(
  processId: string,
  channelId: string,
  ledgerId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.LedgerTopUpState> {
  const lastCommitment = helpers.getLatestCommitment(ledgerId, sharedData);

  const newProtocolState = states.waitForPreTopUpLedgerUpdate({
    processId,
    ledgerId,
    channelId,
    proposedAllocation,
    proposedDestination,
  });

  if (helpers.isFirstPlayer(ledgerId, sharedData)) {
    const newAllocation = [
      ...lastCommitment.allocation,
      ...calculateTopUpAllocation(proposedAllocation, lastCommitment.allocation),
    ];
    const newDestination = [...lastCommitment.destination, ...proposedDestination];
    const ourCommitment = proposeNewConsensus(lastCommitment, newAllocation, newDestination);
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: newProtocolState, sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      helpers.getOpponentAddress(ledgerId, sharedData),
      processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      LEDGER_TOP_UP_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }
  sharedData = registerChannelToMonitor(sharedData, processId, ledgerId);
  return {
    protocolState: newProtocolState,
    sharedData,
  };
}

export const ledgerTopUpReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.LedgerTopUpState,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  switch (protocolState.type) {
    case 'LedgerTopUp.WaitForPreTopUpLedgerUpdate':
      return waitForPreTopUpLedgerUpdateReducer(protocolState, sharedData, action);
    case 'LedgerTopUp.WaitForDirectFunding':
      return waitForDirectFundingReducer(protocolState, sharedData, action);
    case 'LedgerTopUp.WaitForPostTopUpLedgerUpdate':
      return waitForPostTopUpLedgerUpdateReducer(protocolState, sharedData, action);
    default:
      return { protocolState, sharedData };
  }
};

const waitForPreTopUpLedgerUpdateReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForPreTopUpLedgerUpdate,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    console.warn(
      `Ledger Top Up Protocol expected COMMITMENT_RECEIVED received ${action.type} instead.`,
    );
    return { protocolState, sharedData };
  }

  const checkResult = checkAndStore(sharedData, action.signedCommitment);

  if (!checkResult.isSuccess) {
    return {
      protocolState: states.failure({ reason: 'Received Invalid Commitment' }),
      sharedData,
    };
  }
  sharedData = checkResult.store;
  const isFirstPlayer = helpers.isFirstPlayer(protocolState.ledgerId, sharedData);
  // Accept consensus if player B
  if (!isFirstPlayer) {
    const ourCommitment = acceptConsensus(action.signedCommitment.commitment);
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: states.failure({ reason: 'Signature Failure' }), sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      helpers.getOpponentAddress(protocolState.ledgerId, sharedData),
      protocolState.processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      LEDGER_TOP_UP_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }

  // Create direct funding state
  const lastCommitment = helpers.getLatestCommitment(protocolState.ledgerId, sharedData);
  const directFundingAction = directFundingRequested({
    processId: protocolState.processId,
    channelId: protocolState.ledgerId,
    safeToDepositLevel: isFirstPlayer ? '0x0' : lastCommitment.allocation[2],
    requiredDeposit: isFirstPlayer ? lastCommitment.allocation[2] : lastCommitment.allocation[3],
    totalFundingRequired: calculateTotalTopUp(lastCommitment.allocation),
    ourIndex: isFirstPlayer ? TwoPartyPlayerIndex.A : TwoPartyPlayerIndex.B,
    exchangePostFundSetups: false,
  });
  const { protocolState: directFundingState, sharedData: newSharedData } = initializeDirectFunding(
    directFundingAction,
    sharedData,
  );

  return {
    protocolState: states.waitForDirectFunding({ ...protocolState, directFundingState }),
    sharedData: newSharedData,
  };
};

const waitForDirectFundingReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForDirectFunding,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  const existingDirectFundingState = protocolState.directFundingState;
  const protocolStateWithSharedData = directFundingStateReducer(
    existingDirectFundingState,
    sharedData,
    action,
  );
  const newDirectFundingState = protocolStateWithSharedData.protocolState;
  const newProtocolState = { ...protocolState, directFundingState: newDirectFundingState };
  sharedData = protocolStateWithSharedData.sharedData;

  if (!isTerminal(newDirectFundingState)) {
    return { protocolState: newProtocolState, sharedData };
  }
  if (isFailure(newDirectFundingState)) {
    return { protocolState: states.failure({ reason: 'Direct Funding Failure' }), sharedData };
  }
  if (isSuccess(newDirectFundingState)) {
    const channel = getExistingChannel(sharedData, newProtocolState.ledgerId);

    if (helpers.isFirstPlayer(protocolState.ledgerId, sharedData)) {
      const theirCommitment = getLastCommitment(channel);
      const { allocation: oldAllocation, destination: oldDestination } = theirCommitment;
      const newAllocation = [
        addHex(oldAllocation[0], oldAllocation[2]),
        addHex(oldAllocation[1], oldAllocation[3]),
      ];
      const newDestination = [oldDestination[0], oldDestination[1]];
      const ourCommitment = proposeNewConsensus(theirCommitment, newAllocation, newDestination);
      const signResult = signAndStore(sharedData, ourCommitment);
      if (!signResult.isSuccess) {
        return { protocolState: newProtocolState, sharedData };
      }
      sharedData = signResult.store;

      const messageRelay = sendCommitmentReceived(
        theirAddress(channel),
        protocolState.processId,
        signResult.signedCommitment.commitment,
        signResult.signedCommitment.signature,
        LEDGER_TOP_UP_PROTOCOL_LOCATOR,
      );
      sharedData = queueMessage(sharedData, messageRelay);
    }
    return { protocolState: states.waitForPostTopUpLedgerUpdate(protocolState), sharedData };
  }

  return { protocolState, sharedData };
};

const waitForPostTopUpLedgerUpdateReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForPostTopUpLedgerUpdate,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    console.warn(
      `Ledger Top Up Protocol expected COMMITMENT_RECEIVED received ${action.type} instead.`,
    );
    return { protocolState, sharedData };
  }

  const checkResult = checkAndStore(sharedData, action.signedCommitment);

  if (!checkResult.isSuccess) {
    return {
      protocolState: states.failure({ reason: 'Received Invalid Commitment' }),
      sharedData,
    };
  }
  sharedData = checkResult.store;
  const isFirstPlayer = helpers.isFirstPlayer(protocolState.ledgerId, sharedData);
  // Accept consensus if player B
  if (!isFirstPlayer) {
    const ourCommitment = acceptConsensus(action.signedCommitment.commitment);
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: states.failure({ reason: 'Signature Failure' }), sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      helpers.getOpponentAddress(protocolState.ledgerId, sharedData),
      protocolState.processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      LEDGER_TOP_UP_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }

  return { protocolState: states.success({}), sharedData };
};

function calculateTotalTopUp(allocation: string[]): string {
  return bigNumberify(allocation[2])
    .add(allocation[3])
    .toHexString();
}

function calculateTopUpAllocation(
  proposedAllocation: string[],
  currentAllocation: string[],
): string[] {
  const newAllocation: string[] = [];
  for (let i = 0; i < currentAllocation.length; i++) {
    const currentFunds = bigNumberify(currentAllocation[i]);
    const proposedFunds = bigNumberify(proposedAllocation[i]);
    const topUp = currentFunds.gte(proposedFunds)
      ? '0x0'
      : proposedFunds.sub(currentFunds).toHexString();
    newAllocation[i] = topUp;
  }
  return newAllocation;
}
