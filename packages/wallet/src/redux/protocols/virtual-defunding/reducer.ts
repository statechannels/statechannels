import {Outcome, convertAddressToBytes32} from "@statechannels/nitro-protocol";

import {SharedData} from "../../state";
import {ProtocolLocator} from "../../../communication";
import {ConsensusUpdateState, initializeConsensusUpdate} from "../consensus-update";
import {
  CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
  consensusUpdateReducer
} from "../consensus-update/reducer";
import {getChannelFundingState} from "../../selectors";
import {getTwoPlayerIndex, getFundingChannelId, getLatestState} from "../reducer-helpers";

import {routesToConsensusUpdate} from "../consensus-update/actions";
import {HUB_ADDRESS} from "../../../constants";
import {
  getAllocationOutcome,
  getAllocationTotal,
  getAllocationItemAtIndex,
  getAllocationAmountForIndex
} from "../../../utils/outcome-utils";
import {TwoPartyPlayerIndex} from "../../types";

import {VirtualDefundingAction} from "./actions";

import * as states from "./states";

import {ProtocolStateWithSharedData, makeLocator, ProtocolReducer} from "..";

export function initialize({
  processId,
  targetChannelId,
  protocolLocator,
  sharedData
}: {
  processId: string;
  targetChannelId: string;
  protocolLocator: ProtocolLocator;
  sharedData: SharedData;
}): ProtocolStateWithSharedData<states.NonTerminalVirtualDefundingState> {
  const fundingState = getChannelFundingState(sharedData, targetChannelId);
  if (!fundingState || !fundingState.fundingChannel) {
    throw new Error(`Attempting to virtually defund a directly funded channel ${targetChannelId}`);
  }
  const jointChannelId = fundingState.fundingChannel;
  const latestAppState = getLatestState(targetChannelId, sharedData);
  const ourIndex = getTwoPlayerIndex(targetChannelId, sharedData);
  const hubAddress = HUB_ADDRESS;
  const proposedOutcome = createJointChannelProposedOutcome(latestAppState.outcome, hubAddress);

  let jointChannel: ConsensusUpdateState;
  ({protocolState: jointChannel, sharedData} = initializeConsensusUpdate({
    processId,
    protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
    clearedToSend: true,
    channelId: jointChannelId,
    proposedOutcome,
    sharedData
  }));
  const ledgerChannelId = getFundingChannelId(targetChannelId, sharedData);
  return {
    protocolState: states.waitForJointChannelUpdate({
      processId,
      ourIndex,
      hubAddress,
      jointChannel,
      jointChannelId,
      targetChannelId,
      ledgerChannelId,
      protocolLocator
    }),
    sharedData
  };
}

export const reducer: ProtocolReducer<states.VirtualDefundingState> = (
  protocolState: states.NonTerminalVirtualDefundingState,
  sharedData: SharedData,
  action: VirtualDefundingAction
) => {
  switch (protocolState.type) {
    case "VirtualDefunding.WaitForJointChannelUpdate":
      return waitForJointChannelUpdateReducer(protocolState, sharedData, action);
    case "VirtualDefunding.WaitForLedgerChannelUpdate":
      return waitForLedgerChannelUpdateReducer(protocolState, sharedData, action);
    default:
      return {protocolState, sharedData};
  }
};

function waitForJointChannelUpdateReducer(
  protocolState: states.WaitForJointChannelUpdate,
  sharedData: SharedData,
  action: VirtualDefundingAction
): ProtocolStateWithSharedData<states.VirtualDefundingState> {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    let jointChannel: ConsensusUpdateState;
    ({protocolState: jointChannel, sharedData} = consensusUpdateReducer(
      protocolState.jointChannel,
      sharedData,
      action
    ));
    switch (jointChannel.type) {
      case "ConsensusUpdate.Failure":
        return {protocolState: states.failure({}), sharedData};
      case "ConsensusUpdate.Success":
        const {
          hubAddress,
          ledgerChannelId,
          targetChannelId: appChannelId,
          ourIndex,
          processId
        } = protocolState;
        // TODO: We probably need to start this earlier to deal with states coming in early

        const latestAppState = getLatestState(appChannelId, sharedData);

        const proposedOutcome = createLedgerChannelProposedOutcome(
          latestAppState.outcome,
          hubAddress,
          ourIndex
        );
        let ledgerChannel: ConsensusUpdateState;
        ({protocolState: ledgerChannel, sharedData} = initializeConsensusUpdate({
          processId,
          protocolLocator: makeLocator(
            protocolState.protocolLocator,
            CONSENSUS_UPDATE_PROTOCOL_LOCATOR
          ),
          channelId: ledgerChannelId,
          proposedOutcome,
          clearedToSend: true,
          sharedData
        }));

        return {
          protocolState: states.waitForLedgerChannelUpdate({...protocolState, ledgerChannel}),
          sharedData
        };
      default:
        return {
          protocolState: {...protocolState, jointChannel},
          sharedData
        };
    }
  }
  return {protocolState, sharedData};
}

function waitForLedgerChannelUpdateReducer(
  protocolState: states.WaitForLedgerChannelUpdate,
  sharedData: SharedData,
  action: VirtualDefundingAction
): ProtocolStateWithSharedData<states.VirtualDefundingState> {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    let ledgerChannel: ConsensusUpdateState;
    ({protocolState: ledgerChannel, sharedData} = consensusUpdateReducer(
      protocolState.ledgerChannel,
      sharedData,
      action
    ));
    switch (ledgerChannel.type) {
      case "ConsensusUpdate.Failure":
        return {protocolState: states.failure({}), sharedData};
      case "ConsensusUpdate.Success":
        return {protocolState: states.success({}), sharedData};
      default:
        return {
          protocolState: {...protocolState, ledgerChannel},
          sharedData
        };
    }
  }
  return {protocolState, sharedData};
}

function createJointChannelProposedOutcome(appOutcome: Outcome, hubAddress: string): Outcome {
  const allocationOutcome = getAllocationOutcome(appOutcome);
  const newAllocation = [...allocationOutcome.allocationItems];
  newAllocation.push({
    destination: convertAddressToBytes32(hubAddress),
    amount: getAllocationTotal(appOutcome)
  });
  return [
    {assetHolderAddress: allocationOutcome.assetHolderAddress, allocationItems: newAllocation}
  ];
}
function createLedgerChannelProposedOutcome(
  appOutcome: Outcome,
  hubAddress: string,
  ourIndex: TwoPartyPlayerIndex
): Outcome {
  const allocationOutcome = getAllocationOutcome(appOutcome);
  const ourAllocation = getAllocationItemAtIndex(appOutcome, ourIndex);
  const theirAmount = getAllocationAmountForIndex(appOutcome, 1 - ourIndex);
  const newAllocation = [
    {...ourAllocation},
    {
      destination: convertAddressToBytes32(hubAddress),
      amount: theirAmount
    }
  ];
  return [
    {assetHolderAddress: allocationOutcome.assetHolderAddress, allocationItems: newAllocation}
  ];
}
