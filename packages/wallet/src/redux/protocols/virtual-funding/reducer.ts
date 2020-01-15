import * as states from "./states";
import {SharedData, getPrivatekey, setFundingState} from "../../state";
import {ProtocolStateWithSharedData, ProtocolReducer, makeLocator} from "..";
import {WalletAction, advanceChannel} from "../../actions";
import {VirtualFundingAction} from "./actions";
import {unreachable} from "../../../utils/reducer-utils";
import {CONSENSUS_LIBRARY_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from "../../../constants";
import {advanceChannelReducer} from "../advance-channel";
import * as consensusUpdate from "../consensus-update";
import * as ledgerFunding from "../ledger-funding";
import {addHex} from "../../../utils/hex-utils";
import {ADVANCE_CHANNEL_PROTOCOL_LOCATOR} from "../advance-channel/reducer";
import {routesToAdvanceChannel} from "../advance-channel/actions";
import {routesToLedgerFunding} from "../ledger-funding/actions";
import {routesToConsensusUpdate, clearedToSend} from "../consensus-update/actions";
import {EmbeddedProtocol} from "../../../communication";

export const VIRTUAL_FUNDING_PROTOCOL_LOCATOR = "VirtualFunding";
import {CONSENSUS_UPDATE_PROTOCOL_LOCATOR} from "../consensus-update/reducer";
import {TwoPartyPlayerIndex} from "../../types";
import {Wallet} from "ethers";
import {StateType} from "../advance-channel/states";
import {
  encodeConsensusData,
  Outcome,
  isAllocationOutcome,
  convertAddressToBytes32
} from "@statechannels/nitro-protocol";
import {AllocationAssetOutcome} from "@statechannels/nitro-protocol";

export function initialize(
  sharedData: SharedData,
  args: states.InitializationArgs
): ProtocolStateWithSharedData<states.NonTerminalVirtualFundingState> {
  const {
    ourIndex,
    processId,
    targetChannelId,
    startingOutcome,
    hubAddress,
    protocolLocator,
    participants
  } = args;
  const privateKey = getPrivatekey(sharedData, targetChannelId);
  const appDefinition = CONSENSUS_LIBRARY_ADDRESS;
  const outcome = calculateInitialJointOutcome(startingOutcome, hubAddress);

  const jointChannelInitialized = advanceChannel.initializeAdvanceChannel(sharedData, {
    privateKey,
    appDefinition,
    ourIndex,
    stateType: StateType.PreFundSetup,
    clearedToSend: true,
    processId,
    protocolLocator: makeLocator(protocolLocator, ADVANCE_CHANNEL_PROTOCOL_LOCATOR),
    outcome,
    participants: participants.concat(hubAddress),
    appData: getInitialAppData()
  });

  return {
    protocolState: states.waitForJointChannel({
      processId,
      jointChannel: jointChannelInitialized.protocolState,
      targetChannelId,
      startingOutcome,
      ourIndex,
      hubAddress,
      protocolLocator,
      participants
    }),
    sharedData: jointChannelInitialized.sharedData
  };
}

export const reducer: ProtocolReducer<states.VirtualFundingState> = (
  protocolState: states.NonTerminalVirtualFundingState,
  sharedData: SharedData,
  action: VirtualFundingAction
) => {
  switch (protocolState.type) {
    case "VirtualFunding.WaitForJointChannel": {
      return waitForJointChannelReducer(protocolState, sharedData, action);
    }
    case "VirtualFunding.WaitForGuarantorChannel": {
      return waitForGuarantorChannelReducer(protocolState, sharedData, action);
    }
    case "VirtualFunding.WaitForGuarantorFunding": {
      return waitForGuarantorFundingReducer(protocolState, sharedData, action);
    }
    case "VirtualFunding.WaitForApplicationFunding": {
      return waitForApplicationFundingReducer(protocolState, sharedData, action);
    }
    default:
      return unreachable(protocolState);
  }
};

function waitForJointChannelReducer(
  protocolState: states.WaitForJointChannel,
  sharedData: SharedData,
  action: WalletAction
) {
  const {processId, hubAddress, protocolLocator} = protocolState;
  if (routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    const result = advanceChannelReducer(protocolState.jointChannel, sharedData, action);

    if (advanceChannel.isSuccess(result.protocolState)) {
      const {channelId: jointChannelId} = result.protocolState;
      switch (result.protocolState.stateType) {
        case StateType.PreFundSetup:
          const jointChannelResult = advanceChannel.initializeAdvanceChannel(result.sharedData, {
            clearedToSend: true,
            stateType: StateType.PostFundSetup,
            processId,
            protocolLocator: makeLocator(protocolLocator, ADVANCE_CHANNEL_PROTOCOL_LOCATOR),
            channelId: jointChannelId,
            ourIndex: protocolState.ourIndex
          });

          return {
            protocolState: {
              ...protocolState,
              jointChannel: jointChannelResult.protocolState
            },
            sharedData: jointChannelResult.sharedData
          };
        case StateType.PostFundSetup:
          const {targetChannelId} = protocolState;
          const privateKey = getPrivatekey(sharedData, targetChannelId);
          const ourAddress = new Wallet(privateKey).address;
          const appDefinition = CONSENSUS_LIBRARY_ADDRESS;

          const destinations = [
            targetChannelId,
            window.ethereum ? window.ethereum.selectedAddress : ourAddress,
            hubAddress
          ];
          const outcome = createGuaranteeOutcome(destinations, jointChannelId);

          const guarantorChannelResult = advanceChannel.initializeAdvanceChannel(
            result.sharedData,
            {
              clearedToSend: true,
              stateType: StateType.PreFundSetup,
              processId,
              protocolLocator: makeLocator(protocolLocator, ADVANCE_CHANNEL_PROTOCOL_LOCATOR),
              ourIndex: TwoPartyPlayerIndex.A, // When creating the guarantor channel with the hub we are always the first player
              privateKey,
              appDefinition,
              participants: [ourAddress, hubAddress],
              outcome,
              appData: getInitialAppData()
            }
          );
          return {
            protocolState: states.waitForGuarantorChannel({
              ...protocolState,
              guarantorChannel: guarantorChannelResult.protocolState,
              jointChannelId
            }),
            sharedData: guarantorChannelResult.sharedData
          };
        default:
          return {
            protocolState: states.waitForJointChannel({
              ...protocolState,
              jointChannel: result.protocolState
            }),
            sharedData: result.sharedData
          };
      }
    } else {
      return {
        protocolState: states.waitForJointChannel({
          ...protocolState,
          jointChannel: result.protocolState
        }),
        sharedData: result.sharedData
      };
    }
  }
  return {protocolState, sharedData};
}

function waitForGuarantorChannelReducer(
  protocolState: states.WaitForGuarantorChannel,
  sharedData: SharedData,
  action: WalletAction
) {
  const {processId, protocolLocator} = protocolState;
  if (routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    const result = advanceChannelReducer(protocolState.guarantorChannel, sharedData, action);
    if (advanceChannel.isSuccess(result.protocolState)) {
      const {channelId: guarantorChannelId} = result.protocolState;
      const fundingState = {
        guarantorChannel: guarantorChannelId,
        directlyFunded: false
      };
      result.sharedData = setFundingState(
        result.sharedData,
        protocolState.jointChannelId,
        fundingState
      );
      const {hubAddress, ourIndex, participants, startingOutcome} = protocolState;
      switch (result.protocolState.stateType) {
        case StateType.PreFundSetup:
          const guarantorChannelResult = advanceChannel.initializeAdvanceChannel(
            result.sharedData,
            {
              clearedToSend: true,
              stateType: StateType.PostFundSetup,
              processId,
              protocolLocator: makeLocator(protocolLocator, ADVANCE_CHANNEL_PROTOCOL_LOCATOR),
              channelId: guarantorChannelId,
              ourIndex: TwoPartyPlayerIndex.A // When creating the guarantor channel with the hub we are always the first player
            }
          );
          return {
            protocolState: {
              ...protocolState,
              guarantorChannel: guarantorChannelResult.protocolState
            },
            sharedData: guarantorChannelResult.sharedData
          };

        case StateType.PostFundSetup:
          const outcome = calculateLedgerOutcome(
            startingOutcome,
            window.ethereum ? window.ethereum.selectedAddress : participants[ourIndex],
            hubAddress
          );

          const ledgerFundingResult = ledgerFunding.initializeLedgerFunding({
            processId,
            channelId: result.protocolState.channelId,
            startingOutcome: outcome,
            participants: [participants[ourIndex], hubAddress],
            sharedData: result.sharedData,
            protocolLocator: makeLocator(
              protocolState.protocolLocator,
              EmbeddedProtocol.LedgerFunding
            )
          });
          switch (ledgerFundingResult.protocolState.type) {
            case "LedgerFunding.Failure":
              return {
                protocolState: states.failure({}),
                sharedData: ledgerFundingResult.sharedData
              };
            default:
              const {jointChannelId, targetChannelId} = protocolState;
              // We initialize our joint channel sub-protocol early in case we receive a state before we're done funding
              const proposedOutcome = calculateJointProposedOutcome(
                startingOutcome,
                targetChannelId,
                hubAddress
              );
              const applicationFundingResult = consensusUpdate.initializeConsensusUpdate({
                processId,
                channelId: jointChannelId,
                clearedToSend: false,
                proposedOutcome,
                protocolLocator: makeLocator(
                  protocolState.protocolLocator,
                  CONSENSUS_UPDATE_PROTOCOL_LOCATOR
                ),
                sharedData: ledgerFundingResult.sharedData
              });
              return {
                protocolState: states.waitForGuarantorFunding({
                  ...protocolState,
                  indirectGuarantorFunding: ledgerFundingResult.protocolState,
                  indirectApplicationFunding: applicationFundingResult.protocolState
                }),
                sharedData: applicationFundingResult.sharedData
              };
          }

        default:
          return {
            protocolState: states.waitForGuarantorChannel({
              ...protocolState,
              guarantorChannel: result.protocolState
            }),
            sharedData: result.sharedData
          };
      }
    } else {
      return {
        protocolState: states.waitForGuarantorChannel({
          ...protocolState,
          guarantorChannel: result.protocolState
        }),
        sharedData: result.sharedData
      };
    }
  }
  return {protocolState, sharedData};
}

function waitForGuarantorFundingReducer(
  protocolState: states.WaitForGuarantorFunding,
  sharedData: SharedData,
  action: WalletAction
) {
  const {processId, protocolLocator} = protocolState;

  if (routesToConsensusUpdate(action, protocolLocator)) {
    let indirectApplicationFunding: consensusUpdate.ConsensusUpdateState;
    ({
      protocolState: indirectApplicationFunding,
      sharedData
    } = consensusUpdate.consensusUpdateReducer(
      protocolState.indirectApplicationFunding,
      sharedData,
      action
    ));
    switch (indirectApplicationFunding.type) {
      // TODO: Properly handle the success case
      // We don't expect this to ever happen now but we should future-proof it
      case "ConsensusUpdate.Success":
      case "ConsensusUpdate.Failure":
        return {
          protocolState: states.failure({
            reason: "Consensus Update failed or succeeded too early"
          }),
          sharedData
        };
      default:
        return {protocolState: {...protocolState, indirectApplicationFunding}, sharedData};
    }
  } else if (routesToLedgerFunding(action, protocolLocator)) {
    const result = ledgerFunding.ledgerFundingReducer(
      protocolState.indirectGuarantorFunding,
      sharedData,
      action
    );

    switch (result.protocolState.type) {
      case "LedgerFunding.Success":
        // Once funding is complete we allow consensusUpdate to send states
        const applicationFundingResult = consensusUpdate.consensusUpdateReducer(
          protocolState.indirectApplicationFunding,
          result.sharedData,
          clearedToSend({
            processId,
            protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR)
          })
        );
        return {
          protocolState: states.waitForApplicationFunding({
            ...protocolState,
            indirectApplicationFunding: applicationFundingResult.protocolState
          }),
          sharedData: applicationFundingResult.sharedData
        };
      case "LedgerFunding.Failure":
        throw new Error(`Indirect funding failed: ${result.protocolState.reason}`);

      default:
        return {
          protocolState: states.waitForGuarantorFunding({
            ...protocolState,

            indirectGuarantorFunding: result.protocolState
          }),
          sharedData: result.sharedData
        };
    }
  } else {
    console.warn(
      `Expected ledgerFunding or consensusUpdate action, received ${action.type} instead`
    );
    return {protocolState, sharedData};
  }
}

function waitForApplicationFundingReducer(
  protocolState: states.WaitForApplicationFunding,
  sharedData: SharedData,
  action: WalletAction
) {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    const result = consensusUpdate.consensusUpdateReducer(
      protocolState.indirectApplicationFunding,
      sharedData,
      action
    );
    if (consensusUpdate.isTerminal(result.protocolState)) {
      switch (result.protocolState.type) {
        case "ConsensusUpdate.Success":
          result.sharedData = setFundingState(result.sharedData, protocolState.targetChannelId, {
            directlyFunded: false,
            fundingChannel: protocolState.jointChannelId
          });
          return {
            protocolState: states.success(protocolState),
            sharedData: result.sharedData
          };
        case "ConsensusUpdate.Failure":
          throw new Error(`Indirect funding failed: ${result.protocolState.reason}`);

        default:
          return unreachable(result.protocolState);
      }
    } else {
      return {
        protocolState: states.waitForApplicationFunding({
          ...protocolState,
          indirectApplicationFunding: result.protocolState
        }),
        sharedData: result.sharedData
      };
    }
  }
  return {protocolState, sharedData};
}

function getInitialAppData() {
  return encodeConsensusData({furtherVotesRequired: 0, proposedOutcome: []});
}

function createGuaranteeOutcome(destinations: string[], targetChannelId: string): Outcome {
  return [
    {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,

      guarantee: {
        destinations: destinations.map(d => (d.length === 42 ? convertAddressToBytes32(d) : d)),
        targetChannelId
      }
    }
  ];
}

function calculateLedgerOutcome(outcome: Outcome, ourAddress: string, hubAddress: string): Outcome {
  if (outcome.length !== 1) {
    throw new Error(
      `The Virtual funding protocol currently only supports 1 outcome. Received ${outcome.length} outcomes`
    );
  }
  const assetOutcome = outcome[0];
  if (!isAllocationOutcome(assetOutcome)) {
    throw new Error("Expected an allocation outcome, not a guarantee outcome");
  }
  // TODO: Move convertAddressToBytes32 out of nitro converter

  const ourConvertedAddress = convertAddressToBytes32(ourAddress);
  const ourAllocation = assetOutcome.allocation.find(a => a.destination === ourConvertedAddress);
  if (!ourAllocation) {
    throw new Error(`Could not find an allocation with destination ${ourConvertedAddress}`);
  }
  const allocation = [
    {
      destination: ourConvertedAddress,
      amount: ourAllocation.amount
    },
    {destination: convertAddressToBytes32(hubAddress), amount: ourAllocation.amount}
  ];
  return [
    {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocation
    }
  ];
}

function calculateAllocationTotal(outcome: Outcome): string {
  if (outcome.length !== 1) {
    throw new Error(
      `The Virtual funding protocol currently only supports 1 outcome. Received ${outcome.length} outcomes`
    );
  }
  const assetOutcome = outcome[0];
  if (!isAllocationOutcome(assetOutcome)) {
    throw new Error("Expected an allocation outcome, not a guarantee outcome");
  }
  return assetOutcome.allocation.map(a => a.amount).reduce(addHex);
}

function getAllocationAssetOutcome(outcome: Outcome): AllocationAssetOutcome {
  if (outcome.length !== 1) {
    throw new Error(
      `The Virtual funding protocol currently only supports 1 outcome. Received ${outcome.length} outcomes`
    );
  }
  const assetOutcome = outcome[0];
  if (!isAllocationOutcome(assetOutcome)) {
    throw new Error("Expected an allocation outcome, not a guarantee outcome");
  }
  return assetOutcome;
}
function calculateJointProposedOutcome(
  startingOutcome: Outcome,
  targetChannelId: string,
  hubAddress: string
): Outcome {
  return [
    {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocation: [
        {destination: targetChannelId, amount: calculateAllocationTotal(startingOutcome)},
        {
          destination: convertAddressToBytes32(hubAddress),
          amount: calculateAllocationTotal(startingOutcome)
        }
      ]
    }
  ];
}

function calculateInitialJointOutcome(startingOutcome: Outcome, hubAddress: string): Outcome {
  const total = calculateAllocationTotal(startingOutcome);
  const assetOutcome = getAllocationAssetOutcome(startingOutcome);
  const updatedAllocation = [
    ...assetOutcome.allocation,
    {destination: convertAddressToBytes32(hubAddress), amount: total}
  ];
  return [
    {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocation: updatedAllocation
    }
  ];
}
