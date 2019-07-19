import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, makeLocator } from '..';
import * as selectors from '../../selectors';
import * as helpers from '../reducer-helpers';
import { getLastCommitment, ChannelState } from '../../channel-store/channel-state';
import { CommitmentType } from 'fmg-core';
import {
  initializeExistingLedgerFunding,
  isExistingLedgerFundingAction,
  existingLedgerFundingReducer,
} from '../existing-ledger-funding';
import * as states from './states';
import { isNewLedgerChannelAction, NewLedgerChannelReducer } from '../new-ledger-channel';
import { unreachable } from '../../../utils/reducer-utils';
import { WalletAction } from '../../actions';
import { ProtocolLocator, EmbeddedProtocol } from '../../../communication';
import * as newLedgerChannel from '../new-ledger-channel';
import { EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR } from '../existing-ledger-funding/reducer';

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

  if (ledgerChannelIsReady(existingLedgerChannel)) {
    return fundWithExistingLedgerChannel({
      processId,
      channelId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
      existingLedgerChannel,
    });
  } else {
    const {
      protocolState: newLedgerChannelState,
      sharedData: newSharedData,
    } = newLedgerChannel.initializeNewLedgerChannel(
      processId,
      channelId,
      sharedData,
      makeLocator(protocolLocator, EmbeddedProtocol.NewLedgerChannel),
    );

    if (newLedgerChannelState.type === 'NewLedgerChannel.Failure') {
      return {
        protocolState: states.failure({ reason: 'NewLedgerChannel Failure' }),
        sharedData: newSharedData,
      };
    }

    return {
      protocolState: states.waitForNewLedgerChannel({
        processId,
        channelId,
        newLedgerChannel: newLedgerChannelState,
        targetAllocation,
        targetDestination,
        protocolLocator,
      }),
      sharedData: newSharedData,
    };
  }
}

export function indirectFundingReducer(
  protocolState: states.NonTerminalIndirectFundingState,
  sharedData: SharedData,
  action: WalletAction,
): ProtocolStateWithSharedData<states.IndirectFundingState> {
  switch (protocolState.type) {
    case 'IndirectFunding.WaitForNewLedgerChannel':
      return waitForNewLedgerChannelReducer(protocolState, action, sharedData);
    case 'IndirectFunding.WaitForExistingLedgerFunding':
      return waitForExistingLedgerFundingReducer(protocolState, action, sharedData);

    default:
      return unreachable(protocolState);
  }
}

function waitForNewLedgerChannelReducer(
  protocolState: states.WaitForNewLedgerChannel,
  action: WalletAction,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.IndirectFundingState> {
  if (!isNewLedgerChannelAction(action)) {
    console.warn(`Received ${action} but currently in ${protocolState.type}`);
    return { protocolState, sharedData };
  }

  const {
    protocolState: newLedgerChannelState,
    sharedData: newSharedData,
  } = NewLedgerChannelReducer(protocolState.newLedgerChannel, sharedData, action);
  switch (newLedgerChannelState.type) {
    case 'NewLedgerChannel.Failure':
      return {
        protocolState: states.failure({ reason: 'NewLedgerChannel Failure' }),
        sharedData: newSharedData,
      };
    case 'NewLedgerChannel.Success':
      const { ledgerId } = newLedgerChannelState;
      const { channelId, protocolLocator } = protocolState;
      const existingLedgerChannel = selectors.getChannelState(newSharedData, ledgerId);
      return fundWithExistingLedgerChannel({
        ...protocolState,
        channelId,
        sharedData: newSharedData,
        existingLedgerChannel,
        protocolLocator,
      });
    default:
      return {
        protocolState: states.waitForNewLedgerChannel({
          ...protocolState,
          newLedgerChannel: newLedgerChannelState,
        }),
        sharedData: newSharedData,
      };
  }
}

function waitForExistingLedgerFundingReducer(
  protocolState: states.WaitForExistingLedgerFunding,
  action: WalletAction,
  sharedData: SharedData,
) {
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

function fundWithExistingLedgerChannel({
  processId,
  channelId,
  targetAllocation,
  targetDestination,
  sharedData,
  existingLedgerChannel,
  protocolLocator,
}: {
  processId: string;
  channelId: string;
  targetAllocation: string[];
  targetDestination: string[];
  sharedData: SharedData;
  existingLedgerChannel: ChannelState;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.NonTerminalIndirectFundingState | states.Failure> {
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
    makeLocator(protocolLocator, EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR),
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
      protocolLocator,
    }),
    sharedData: newSharedData,
  };
}

function ledgerChannelIsReady(
  existingLedgerChannel: ChannelState | undefined,
): existingLedgerChannel is ChannelState {
  return (
    !!existingLedgerChannel &&
    (getLastCommitment(existingLedgerChannel).commitmentType === CommitmentType.App ||
      getLastCommitment(existingLedgerChannel).commitmentType === CommitmentType.PostFundSetup)
  );
}
