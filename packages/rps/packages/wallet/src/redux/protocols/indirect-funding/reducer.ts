import { SharedData } from '../../state';
import { ProtocolStateWithSharedData } from '..';
import { IndirectFundingState } from './states';
import * as selectors from '../../selectors';
import * as helpers from '../reducer-helpers';
import { getLastCommitment } from '../../channel-store/channel-state';
import { CommitmentType } from 'fmg-core';
import {
  initializeExistingLedgerFunding,
  isExistingLedgerFundingAction,
  existingLedgerFundingReducer,
} from '../existing-ledger-funding';
import * as states from './states';
import {
  initializeNewLedgerFunding,
  isNewLedgerFundingAction,
  newLedgerFundingReducer,
} from '../new-ledger-funding';
import { IndirectFundingAction } from './actions';

export function initialize(
  processId: string,
  channelId: string,
  targetAllocation: string[],
  targetDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<IndirectFundingState> {
  const existingLedgerChannel = selectors.getFundedLedgerChannelForParticipants(
    sharedData,
    helpers.getOurAddress(channelId, sharedData),
    helpers.getOpponentAddress(channelId, sharedData),
  );

  if (
    existingLedgerChannel &&
    (getLastCommitment(existingLedgerChannel).commitmentType === CommitmentType.App ||
      getLastCommitment(existingLedgerChannel).commitmentType === CommitmentType.PostFundSetup)
  ) {
    const ledgerId = existingLedgerChannel.channelId;
    const {
      protocolState: existingLedgerFundingState,
      sharedData: newSharedData,
    } = initializeExistingLedgerFunding(
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      sharedData,
    );

    if (existingLedgerFundingState.type === 'ExistingLedgerFunding.Success') {
      return { protocolState: states.success({}), sharedData: newSharedData };
    } else if (existingLedgerFundingState.type === 'ExistingLedgerFunding.Failure') {
      return {
        protocolState: states.failure({
          reason: 'ExistingLedgerFunding Failure',
        }),
        sharedData: newSharedData,
      };
    }

    return {
      protocolState: states.waitForExistingLedgerFunding({
        processId,
        channelId,
        ledgerId,
        existingLedgerFundingState,
        targetAllocation,
        targetDestination,
      }),
      sharedData: newSharedData,
    };
  } else {
    const {
      protocolState: newLedgerFundingState,
      sharedData: newSharedData,
    } = initializeNewLedgerFunding(
      processId,
      channelId,
      targetAllocation,
      targetDestination,
      sharedData,
    );

    if (newLedgerFundingState.type === 'NewLedgerFunding.Success') {
      return { protocolState: states.success({}), sharedData: newSharedData };
    } else if (newLedgerFundingState.type === 'NewLedgerFunding.Failure') {
      return {
        protocolState: states.failure({ reason: 'NewLedgerFunding Failure' }),
        sharedData: newSharedData,
      };
    }

    return {
      protocolState: states.waitForNewLedgerFunding({
        processId,
        channelId,
        newLedgerFundingState,
        targetAllocation,
        targetDestination,
      }),
      sharedData: newSharedData,
    };
  }
}

export function indirectFundingReducer(
  protocolState: states.IndirectFundingState,
  sharedData: SharedData,
  action: IndirectFundingAction,
): ProtocolStateWithSharedData<states.IndirectFundingState> {
  if (protocolState.type === 'IndirectFunding.WaitForNewLedgerFunding') {
    if (!isNewLedgerFundingAction(action)) {
      console.warn(`Received ${action} but currently in ${protocolState.type}`);
      return { protocolState, sharedData };
    }

    const {
      protocolState: newLedgerFundingState,
      sharedData: newSharedData,
    } = newLedgerFundingReducer(protocolState.newLedgerFundingState, sharedData, action);
    if (newLedgerFundingState.type === 'NewLedgerFunding.Success') {
      return { protocolState: states.success({}), sharedData: newSharedData };
    } else if (newLedgerFundingState.type === 'NewLedgerFunding.Failure') {
      return {
        protocolState: states.failure({ reason: 'NewLedgerFunding Failure' }),
        sharedData: newSharedData,
      };
    } else {
      return {
        protocolState: states.waitForNewLedgerFunding({
          ...protocolState,
          newLedgerFundingState,
        }),
        sharedData: newSharedData,
      };
    }
  } else if (protocolState.type === 'IndirectFunding.WaitForExistingLedgerFunding') {
    if (!isExistingLedgerFundingAction(action)) {
      console.warn(`Received ${action} but currently in ${protocolState.type}`);
      return { protocolState, sharedData };
    }

    const {
      protocolState: existingLedgerFundingState,
      sharedData: newSharedData,
    } = existingLedgerFundingReducer(protocolState.existingLedgerFundingState, sharedData, action);
    if (existingLedgerFundingState.type === 'ExistingLedgerFunding.Success') {
      return { protocolState: states.success({}), sharedData: newSharedData };
    } else if (existingLedgerFundingState.type === 'ExistingLedgerFunding.Failure') {
      return {
        protocolState: states.failure({
          reason: 'ExistingLedgerFunding Failure',
        }),
        sharedData: newSharedData,
      };
    } else {
      return {
        protocolState: states.waitForExistingLedgerFunding({
          ...protocolState,
          existingLedgerFundingState,
        }),
        sharedData: newSharedData,
      };
    }
  }
  return { protocolState, sharedData };
}
