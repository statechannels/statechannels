import {bigNumberify} from "ethers/utils";

import {Outcome} from "@statechannels/nitro-protocol";

import {isDirectFundingAction} from "../direct-funding/actions";
import {addHex, subHex} from "../../../utils/hex-utils";
import {
  initializeConsensusUpdate,
  isConsensusUpdateAction,
  consensusUpdateReducer,
  ConsensusUpdateState
} from "../consensus-update";
import {ProtocolLocator, EmbeddedProtocol} from "../../../communication";
import {CONSENSUS_UPDATE_PROTOCOL_LOCATOR} from "../consensus-update/reducer";
import {DirectFundingState} from "../direct-funding/states";
import {clearedToSend} from "../consensus-update/actions";

import {
  initialize as initializeDirectFunding,
  directFundingStateReducer
} from "../direct-funding/reducer";
import {TwoPartyPlayerIndex} from "../../types";
import * as helpers from "../reducer-helpers";
import {SharedData, registerChannelToMonitor} from "../../state";
import {ETH_ASSET_HOLDER_ADDRESS} from "../../../constants";
import {
  getAllocationAmountForIndex,
  getAllocationItemAtIndex,
  getAllocationOutcome
} from "../../../utils/outcome-utils";

import {LedgerTopUpAction} from "./actions";

import * as states from "./states";

import {ProtocolStateWithSharedData, ProtocolReducer, makeLocator} from "..";
export {LEDGER_TOP_UP_PROTOCOL_LOCATOR} from "../../../communication/protocol-locator";
export function initialize({
  processId,
  channelId,
  ledgerId,
  proposedOutcome,
  originalOutcome,
  protocolLocator,
  sharedData
}: {
  processId: string;
  channelId: string;
  ledgerId: string;
  proposedOutcome: Outcome;
  originalOutcome: Outcome;
  protocolLocator: ProtocolLocator;
  sharedData: SharedData;
}): ProtocolStateWithSharedData<states.LedgerTopUpState> {
  sharedData = registerChannelToMonitor(sharedData, processId, ledgerId, protocolLocator);
  const {consensusUpdateState, sharedData: newSharedData} = initializeConsensusState(
    TwoPartyPlayerIndex.A,
    processId,
    ledgerId,
    proposedOutcome,
    originalOutcome,
    protocolLocator,
    sharedData
  );
  const newProtocolState = states.switchOrderAndAddATopUpUpdate({
    processId,
    ledgerId,
    channelId,
    proposedOutcome,
    originalOutcome,
    consensusUpdateState,
    protocolLocator
  });
  return {protocolState: newProtocolState, sharedData: newSharedData};
}

const restoreOrderAndAddBTopUpUpdateReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.SwitchOrderAndAddATopUpUpdate,
  sharedData: SharedData,
  action: LedgerTopUpAction
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Received non consensus update action in ${protocolState.type} state.`);
    return {protocolState, sharedData};
  }
  const {
    protocolState: consensusUpdateState,
    sharedData: consensusUpdateSharedData
  } = consensusUpdateReducer(protocolState.consensusUpdateState, sharedData, action);
  sharedData = consensusUpdateSharedData;
  const {processId, proposedOutcome, ledgerId, originalOutcome} = protocolState;

  if (consensusUpdateState.type === "ConsensusUpdate.Failure") {
    return {
      protocolState: states.failure({reason: "ConsensusUpdateFailure"}),
      sharedData: consensusUpdateSharedData
    };
  } else if (consensusUpdateState.type === "ConsensusUpdate.Success") {
    // If player B already has enough funds then skip to success
    const playerBHasEnoughFunds = bigNumberify(
      getAllocationAmountForIndex(originalOutcome, TwoPartyPlayerIndex.B)
    ).gte(getAllocationAmountForIndex(proposedOutcome, TwoPartyPlayerIndex.B));
    if (playerBHasEnoughFunds) {
      return {protocolState: states.success({}), sharedData: consensusUpdateSharedData};
    }

    const {directFundingState, sharedData: directFundingSharedData} = initializeDirectFundingState(
      TwoPartyPlayerIndex.B,
      processId,
      ledgerId,
      proposedOutcome,
      originalOutcome,
      makeLocator(protocolState.protocolLocator, EmbeddedProtocol.DirectFunding),
      sharedData
    );

    return {
      protocolState: states.waitForDirectFundingForB({...protocolState, directFundingState}),
      sharedData: directFundingSharedData
    };
  } else {
    return {
      protocolState: states.restoreOrderAndAddBTopUpUpdate({
        ...protocolState,
        consensusUpdateState
      }),
      sharedData
    };
  }
};
const switchOrderAndAddATopUpUpdateReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.SwitchOrderAndAddATopUpUpdate,
  sharedData: SharedData,
  action: LedgerTopUpAction
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Received non consensus update action in ${protocolState.type} state.`);
    return {protocolState, sharedData};
  }

  let consensusUpdateState: ConsensusUpdateState;
  ({protocolState: consensusUpdateState, sharedData} = consensusUpdateReducer(
    protocolState.consensusUpdateState,
    sharedData,
    action
  ));

  const {processId, ledgerId, originalOutcome, proposedOutcome} = protocolState;
  const latestState = helpers.getLatestState(protocolState.ledgerId, sharedData);

  if (consensusUpdateState.type === "ConsensusUpdate.Failure") {
    return {
      protocolState: states.failure({reason: "ConsensusUpdateFailure"}),
      sharedData
    };
  } else if (consensusUpdateState.type === "ConsensusUpdate.Success") {
    const playerAFunded = bigNumberify(
      getAllocationAmountForIndex(originalOutcome, TwoPartyPlayerIndex.A)
    ).gte(getAllocationAmountForIndex(proposedOutcome, TwoPartyPlayerIndex.A));

    ({consensusUpdateState, sharedData} = initializeConsensusState(
      TwoPartyPlayerIndex.B,
      processId,
      ledgerId,
      proposedOutcome,
      latestState.outcome,
      protocolState.protocolLocator,
      sharedData
    ));
    if (playerAFunded) {
      return {
        protocolState: states.restoreOrderAndAddBTopUpUpdate({
          ...protocolState,
          consensusUpdateState
        }),
        sharedData
      };
    }
    let directFundingState: DirectFundingState;
    ({directFundingState, sharedData} = initializeDirectFundingState(
      TwoPartyPlayerIndex.A,
      processId,
      ledgerId,
      proposedOutcome,
      originalOutcome,
      protocolState.protocolLocator,
      sharedData
    ));

    return {
      protocolState: states.waitForDirectFundingForA({
        ...protocolState,
        directFundingState,
        consensusUpdateState
      }),
      sharedData
    };
  } else {
    return {
      protocolState: states.switchOrderAndAddATopUpUpdate({
        ...protocolState,
        consensusUpdateState
      }),
      sharedData
    };
  }
};
const waitForDirectFundingForAReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForDirectFundingForA,
  sharedData: SharedData,
  action: LedgerTopUpAction
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (isDirectFundingAction(action)) {
    let directFundingState: DirectFundingState;
    ({protocolState: directFundingState, sharedData} = directFundingStateReducer(
      protocolState.directFundingState,
      sharedData,
      action
    ));

    const {protocolLocator, processId} = protocolState;
    switch (directFundingState.type) {
      case "DirectFunding.FundingFailure":
        return {protocolState: states.failure({reason: "DirectFundingFailure"}), sharedData};
      case "DirectFunding.FundingSuccess":
        let consensusUpdateState: ConsensusUpdateState;
        ({protocolState: consensusUpdateState, sharedData} = consensusUpdateReducer(
          protocolState.consensusUpdateState,
          sharedData,
          clearedToSend({
            protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
            processId
          })
        ));
        return {
          protocolState: states.restoreOrderAndAddBTopUpUpdate({
            ...protocolState,
            consensusUpdateState
          }),
          sharedData
        };
      default:
        return {protocolState: {...protocolState, directFundingState}, sharedData};
    }
  } else if (isConsensusUpdateAction(action)) {
    let consensusUpdateState: ConsensusUpdateState;
    ({protocolState: consensusUpdateState, sharedData} = consensusUpdateReducer(
      protocolState.consensusUpdateState,
      sharedData,
      action
    ));
    return {protocolState: {...protocolState, consensusUpdateState}, sharedData};
  } else {
    return {protocolState, sharedData};
  }
};

const waitForDirectFundingForBReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForDirectFundingForB,
  sharedData: SharedData,
  action: LedgerTopUpAction
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isDirectFundingAction(action)) {
    console.warn(`Received non direct funding action in ${protocolState.type} state.`);
    return {protocolState, sharedData};
  }

  const {
    protocolState: directFundingState,
    sharedData: directFundingSharedData
  } = directFundingStateReducer(protocolState.directFundingState, sharedData, action);

  sharedData = directFundingSharedData;

  if (directFundingState.type === "DirectFunding.FundingFailure") {
    return {protocolState: states.failure({reason: "DirectFundingFailure"}), sharedData};
  } else if (directFundingState.type === "DirectFunding.FundingSuccess") {
    return {protocolState: states.success({}), sharedData};
  } else {
    return {protocolState: {...protocolState, directFundingState}, sharedData};
  }
};

export const ledgerTopUpReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.LedgerTopUpState,
  sharedData: SharedData,
  action: LedgerTopUpAction
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  switch (protocolState.type) {
    case "LedgerTopUp.SwitchOrderAndAddATopUpUpdate":
      return switchOrderAndAddATopUpUpdateReducer(protocolState, sharedData, action);
    case "LedgerTopUp.WaitForDirectFundingForA":
      return waitForDirectFundingForAReducer(protocolState, sharedData, action);
    case "LedgerTopUp.RestoreOrderAndAddBTopUpUpdate":
      return restoreOrderAndAddBTopUpUpdateReducer(protocolState, sharedData, action);
    case "LedgerTopUp.WaitForDirectFundingForB":
      return waitForDirectFundingForBReducer(protocolState, sharedData, action);
    default:
      return {protocolState, sharedData};
  }
};

function initializeDirectFundingState(
  playerFor: TwoPartyPlayerIndex,
  processId: string,
  ledgerId: string,
  proposedOutcome: Outcome,
  currentOutcome: Outcome,
  protocolLocator: ProtocolLocator,
  sharedData: SharedData
) {
  const isFirstPlayer = helpers.isFirstPlayer(ledgerId, sharedData);

  let requiredDeposit = "0x0";
  const proposedAmountForA = getAllocationAmountForIndex(proposedOutcome, TwoPartyPlayerIndex.A);
  const proposedAmountForB = getAllocationAmountForIndex(proposedOutcome, TwoPartyPlayerIndex.B);
  const currentAmountForA = getAllocationAmountForIndex(currentOutcome, TwoPartyPlayerIndex.A);
  const currentAmountForB = getAllocationAmountForIndex(currentOutcome, TwoPartyPlayerIndex.B);
  if (playerFor === TwoPartyPlayerIndex.A && isFirstPlayer) {
    requiredDeposit = subHex(proposedAmountForA, currentAmountForA);
  } else if (playerFor === TwoPartyPlayerIndex.B && !isFirstPlayer) {
    requiredDeposit = subHex(proposedAmountForB, currentAmountForB);
  }

  let totalFundingRequired = "0x0";
  if (playerFor === TwoPartyPlayerIndex.A) {
    totalFundingRequired = addHex(proposedAmountForA, currentAmountForB);
  } else if (playerFor === TwoPartyPlayerIndex.B) {
    totalFundingRequired = addHex(proposedAmountForA, proposedAmountForB);
  }

  const {assetHolderAddress} = getAllocationOutcome(currentOutcome);

  const {protocolState: directFundingState, sharedData: newSharedData} = initializeDirectFunding({
    processId,
    channelId: ledgerId,
    safeToDepositLevel: "0x0", // Since we only have one player depositing we can always deposit right away
    assetHolderAddress,
    requiredDeposit,
    totalFundingRequired,
    ourIndex: isFirstPlayer ? TwoPartyPlayerIndex.A : TwoPartyPlayerIndex.B,
    sharedData,
    protocolLocator: makeLocator(protocolLocator, EmbeddedProtocol.DirectFunding)
  });
  return {directFundingState, sharedData: newSharedData};
}

function initializeConsensusState(
  playerFor: TwoPartyPlayerIndex,
  processId: string,
  ledgerId: string,
  proposedOutcome: Outcome,
  currentOutcome: Outcome,
  protocolLocator: ProtocolLocator,
  sharedData: SharedData
) {
  let newAllocation;

  const currentForA = getAllocationItemAtIndex(currentOutcome, TwoPartyPlayerIndex.A);
  const proposedForA = getAllocationItemAtIndex(proposedOutcome, TwoPartyPlayerIndex.A);
  const currentForB = getAllocationItemAtIndex(currentOutcome, TwoPartyPlayerIndex.B);
  const proposedForB = getAllocationItemAtIndex(proposedOutcome, TwoPartyPlayerIndex.B);
  // For player A we want to move their top-upped deposit to the end and leave player B's as is
  if (playerFor === TwoPartyPlayerIndex.A) {
    const isCurrentAllocationLarger = bigNumberify(currentForA.amount).gte(proposedForA.amount);

    newAllocation = [
      {...currentForB},
      isCurrentAllocationLarger ? {...currentForA} : {...proposedForA}
    ];
  } else {
    // When we're handling this for player B the allocation has already been flipped, so our current value is first in the allocation
    const isCurrentAllocationLarger = bigNumberify(currentForB.amount).gte(proposedForB.amount);
    // For Player B we're restoring the original order of [A,B]
    newAllocation = [
      {...currentForA},
      isCurrentAllocationLarger ? {...currentForB} : {...proposedForB}
    ];
  }
  const {
    protocolState: consensusUpdateState,
    sharedData: newSharedData
  } = initializeConsensusUpdate({
    processId,
    channelId: ledgerId,
    clearedToSend: true,
    // This will need to change when we start supporting multiple assets
    proposedOutcome: [
      {assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, allocationItems: newAllocation}
    ],
    protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
    sharedData
  });
  return {consensusUpdateState, sharedData: newSharedData};
}
