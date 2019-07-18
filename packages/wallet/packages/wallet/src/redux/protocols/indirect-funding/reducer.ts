import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, makeLocator } from '..';
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
import { WalletAction } from '../../actions';
import { ProtocolLocator, EmbeddedProtocol } from '../../../communication';
import * as newLedgerFunding from '../new-ledger-funding';

export const INDIRECT_FUNDING_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.IndirectFunding);

export function initialize(
  processId: string,
  channelId: string,
  targetAllocation: string[],
  targetDestination: string[],
  sharedData: SharedData,
  protocolLocator: ProtocolLocator,
): ProtocolStateWithSharedData<states.NonTerminalIndirectFundingState | states.Failure> {
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

    if (existingLedgerFundingState.type === 'ExistingLedgerFunding.Failure') {
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
    } = newLedgerFunding.initializeNewLedgerFunding(
      processId,
      channelId,
      targetAllocation,
      targetDestination,
      sharedData,
      makeLocator(protocolLocator, EmbeddedProtocol.NewLedgerFunding),
    );

    if (newLedgerFundingState.type === 'NewLedgerFunding.Failure') {
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
  action: WalletAction,
): ProtocolStateWithSharedData<states.IndirectFundingState> {
  if (protocolState.type === 'IndirectFunding.WaitForNewLedgerFunding') {
    if (!newLedgerFunding.isNewLedgerFundingAction(action)) {
      console.warn(`Received ${action} but currently in ${protocolState.type}`);
      return { protocolState, sharedData };
    }

    const {
      protocolState: newLedgerFundingState,
      sharedData: newSharedData,
    } = newLedgerFunding.newLedgerFundingReducer(
      protocolState.newLedgerFundingState,
      sharedData,
      action,
    );
    if (newLedgerFunding.isSuccess(newLedgerFundingState)) {
      return {
        protocolState: states.success({}),
        sharedData: newSharedData,
      };
    } else if (newLedgerFunding.isFailure(newLedgerFundingState)) {
      return {
        protocolState: states.failure({ reason: 'NewLedgerFunding failure' }),
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
