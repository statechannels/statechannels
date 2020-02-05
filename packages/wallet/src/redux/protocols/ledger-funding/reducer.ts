import {Outcome} from "@statechannels/nitro-protocol";

import {SharedData, getPrivatekey} from "../../state";

import * as selectors from "../../selectors";
import {ChannelState, getLastState} from "../../channel-store/channel-state";
import {isExistingLedgerFundingAction} from "../existing-ledger-funding";
// TODO: Why does importing the reducer from the index result in test failures in grand parent protocols?
import {
  initialize as initializeExistingLedgerFunding,
  existingLedgerFundingReducer
} from "../existing-ledger-funding/reducer";

import {isNewLedgerChannelAction, NewLedgerChannelReducer} from "../new-ledger-channel";
import {unreachable} from "../../../utils/reducer-utils";
import {WalletAction} from "../../actions";
import {ProtocolLocator, EmbeddedProtocol} from "../../../communication";
import * as newLedgerChannel from "../new-ledger-channel";
import {EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR} from "../existing-ledger-funding/reducer";
import {getTwoPlayerIndex} from "../reducer-helpers";

import * as states from "./states";

import {ProtocolStateWithSharedData, makeLocator} from "..";

export const LEDGER_FUNDING_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.LedgerFunding);

export function initialize({
  processId,
  channelId,
  startingOutcome,
  participants,
  sharedData,
  protocolLocator
}: {
  processId: string;
  channelId: string;
  startingOutcome: Outcome;
  participants: string[];
  sharedData: SharedData;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.NonTerminalLedgerFundingState | states.Failure> {
  // TODO: Should take in an arbitrary list of participants
  const existingLedgerChannel = selectors.getFundedLedgerChannelForParticipants(
    sharedData,
    participants[0],
    participants[1]
  );

  if (ledgerChannelIsReady(existingLedgerChannel)) {
    return fundWithExistingLedgerChannel({
      processId,
      channelId,
      startingOutcome,
      protocolLocator,
      sharedData,
      existingLedgerChannel
    });
  } else {
    const ourIndex = getTwoPlayerIndex(channelId, sharedData);
    const privateKey = getPrivatekey(sharedData, channelId);
    const {
      protocolState: newLedgerChannelState,
      sharedData: newSharedData
    } = newLedgerChannel.initializeNewLedgerChannel({
      processId,
      privateKey,
      startingOutcome,
      participants,
      ourIndex,
      sharedData,
      protocolLocator: makeLocator(protocolLocator, EmbeddedProtocol.NewLedgerChannel)
    });

    if (newLedgerChannelState.type === "NewLedgerChannel.Failure") {
      return {
        protocolState: states.failure({reason: "NewLedgerChannel Failure"}),
        sharedData: newSharedData
      };
    }

    return {
      protocolState: states.waitForNewLedgerChannel({
        processId,
        channelId,
        newLedgerChannel: newLedgerChannelState,
        startingOutcome,
        protocolLocator
      }),
      sharedData: newSharedData
    };
  }
}

export function ledgerFundingReducer(
  protocolState: states.NonTerminalLedgerFundingState,
  sharedData: SharedData,
  action: WalletAction
): ProtocolStateWithSharedData<states.LedgerFundingState> {
  switch (protocolState.type) {
    case "LedgerFunding.WaitForNewLedgerChannel":
      return waitForNewLedgerChannelReducer(protocolState, action, sharedData);
    case "LedgerFunding.WaitForExistingLedgerFunding":
      return waitForExistingLedgerFundingReducer(protocolState, action, sharedData);

    default:
      return unreachable(protocolState);
  }
}

function waitForNewLedgerChannelReducer(
  protocolState: states.WaitForNewLedgerChannel,
  action: WalletAction,
  sharedData: SharedData
): ProtocolStateWithSharedData<states.LedgerFundingState> {
  if (!isNewLedgerChannelAction(action)) {
    console.warn(`Received ${action} but currently in ${protocolState.type}`);
    return {protocolState, sharedData};
  }

  const {protocolState: newLedgerChannelState, sharedData: newSharedData} = NewLedgerChannelReducer(
    protocolState.newLedgerChannel,
    sharedData,
    action
  );
  switch (newLedgerChannelState.type) {
    case "NewLedgerChannel.Failure":
      return {
        protocolState: states.failure({reason: "NewLedgerChannel Failure"}),
        sharedData: newSharedData
      };
    case "NewLedgerChannel.Success":
      const {ledgerId} = newLedgerChannelState;
      const {channelId, protocolLocator} = protocolState;
      const existingLedgerChannel = selectors.getChannelState(newSharedData, ledgerId);
      return fundWithExistingLedgerChannel({
        ...protocolState,
        channelId,
        sharedData: newSharedData,
        existingLedgerChannel,
        protocolLocator
      });
    default:
      return {
        protocolState: states.waitForNewLedgerChannel({
          ...protocolState,
          newLedgerChannel: newLedgerChannelState
        }),
        sharedData: newSharedData
      };
  }
}

function waitForExistingLedgerFundingReducer(
  protocolState: states.WaitForExistingLedgerFunding,
  action: WalletAction,
  sharedData: SharedData
) {
  if (!isExistingLedgerFundingAction(action)) {
    console.warn(`Received ${action} but currently in ${protocolState.type}`);
    return {protocolState, sharedData};
  }

  const {
    protocolState: existingLedgerFundingState,
    sharedData: newSharedData
  } = existingLedgerFundingReducer(protocolState.existingLedgerFundingState, sharedData, action);
  if (existingLedgerFundingState.type === "ExistingLedgerFunding.Success") {
    return {protocolState: states.success({}), sharedData: newSharedData};
  } else if (existingLedgerFundingState.type === "ExistingLedgerFunding.Failure") {
    return {
      protocolState: states.failure({
        reason: "ExistingLedgerFunding Failure"
      }),
      sharedData: newSharedData
    };
  } else {
    return {
      protocolState: states.waitForExistingLedgerFunding({
        ...protocolState,
        existingLedgerFundingState
      }),
      sharedData: newSharedData
    };
  }
}

function fundWithExistingLedgerChannel({
  processId,
  channelId,
  startingOutcome,
  sharedData,
  existingLedgerChannel,
  protocolLocator
}: {
  processId: string;
  channelId: string;
  startingOutcome: Outcome;
  sharedData: SharedData;
  existingLedgerChannel: ChannelState;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.NonTerminalLedgerFundingState | states.Failure> {
  const ledgerId = existingLedgerChannel.channelId;
  const {
    protocolState: existingLedgerFundingState,
    sharedData: newSharedData
  } = initializeExistingLedgerFunding({
    processId,
    channelId,
    ledgerId,
    startingOutcome,
    protocolLocator: makeLocator(protocolLocator, EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR),
    sharedData
  });

  switch (existingLedgerFundingState.type) {
    case "ExistingLedgerFunding.Failure":
      return {
        protocolState: states.failure(existingLedgerFundingState),
        sharedData: newSharedData
      };
    case "ExistingLedgerFunding.WaitForLedgerTopUp":
    case "ExistingLedgerFunding.WaitForLedgerUpdate":
      return {
        protocolState: states.waitForExistingLedgerFunding({
          processId,
          channelId,
          ledgerId,
          existingLedgerFundingState,
          startingOutcome,
          protocolLocator
        }),
        sharedData: newSharedData
      };
    default:
      return unreachable(existingLedgerFundingState);
  }
}

function ledgerChannelIsReady(
  existingLedgerChannel: ChannelState | undefined
): existingLedgerChannel is ChannelState {
  if (!existingLedgerChannel) {
    return false;
  }
  const lastState = getLastState(existingLedgerChannel);
  const {participants} = lastState.channel;
  return (
    !lastState.isFinal && getLastState(existingLedgerChannel).turnNum >= 2 * participants.length - 1
  );
}
