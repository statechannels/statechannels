import {SharedData, ChannelFundingState, setFundingState} from "../../state";
import * as states from "./states";
import {ProtocolStateWithSharedData, makeLocator} from "..";
import {ExistingLedgerFundingAction} from "./actions";
import {bigNumberify} from "ethers/utils";
import {ProtocolLocator} from "../../../communication";
import {
  initialize as initializeLedgerTopUp,
  ledgerTopUpReducer,
  LEDGER_TOP_UP_PROTOCOL_LOCATOR
} from "../ledger-top-up/reducer";
import {routesToLedgerTopUp} from "../ledger-top-up/actions";
import {initializeConsensusUpdate} from "../consensus-update";
import {
  CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
  consensusUpdateReducer
} from "../consensus-update/reducer";
import {
  clearedToSend,
  routesToConsensusUpdate,
  isConsensusUpdateAction
} from "../consensus-update/actions";
import {
  TerminalConsensusUpdateState,
  isTerminal,
  ConsensusUpdateState
} from "../consensus-update/states";
import {LedgerTopUpState} from "../ledger-top-up/states";
import {Outcome, State} from "@statechannels/nitro-protocol";
import {getLatestState} from "../reducer-helpers";
import {
  getAllocationOutcome,
  getAllocationAmount,
  outcomeContainsId,
  getAllocationTotal
} from "../../../utils/outcome-utils";
import {AllocationAssetOutcome} from "@statechannels/nitro-protocol";
export {EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR} from "../../../communication/protocol-locator";

export const initialize = ({
  processId,
  channelId,
  ledgerId,
  startingOutcome,
  protocolLocator,
  sharedData
}: {
  processId: string;
  channelId: string;
  ledgerId: string;
  startingOutcome: Outcome;
  protocolLocator: ProtocolLocator;
  sharedData: SharedData;
}): ProtocolStateWithSharedData<states.NonTerminalExistingLedgerFundingState | states.Failure> => {
  const theirState = getLatestState(ledgerId, sharedData);
  const proposedOutcome = craftAppFunding(channelId, ledgerId, startingOutcome, sharedData);

  let consensusUpdateState: ConsensusUpdateState;
  ({sharedData, protocolState: consensusUpdateState} = initializeConsensusUpdate({
    processId,
    channelId: ledgerId,
    clearedToSend: false,
    proposedOutcome,
    protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
    sharedData
  }));

  if (ledgerChannelNeedsTopUp(theirState, startingOutcome)) {
    let ledgerTopUpState: LedgerTopUpState;
    ({protocolState: ledgerTopUpState, sharedData} = initializeLedgerTopUp({
      processId,
      channelId,
      ledgerId,
      proposedOutcome: startingOutcome,
      originalOutcome: theirState.outcome,
      protocolLocator: makeLocator(protocolLocator, LEDGER_TOP_UP_PROTOCOL_LOCATOR),
      sharedData
    }));

    return {
      protocolState: states.waitForLedgerTopUp({
        ledgerTopUpState,
        processId,
        channelId,
        ledgerId,
        startingOutcome,
        protocolLocator,
        consensusUpdateState
      }),
      sharedData
    };
  }
  // If the ledger channel does not need a top up we can start exchanging consensus states
  ({sharedData, protocolState: consensusUpdateState} = consensusUpdateReducer(
    consensusUpdateState,
    sharedData,
    clearedToSend({
      protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
      processId
    })
  ));
  return {
    protocolState: states.waitForLedgerUpdate({
      processId,
      ledgerId,
      channelId,
      startingOutcome,
      consensusUpdateState,
      protocolLocator
    }),
    sharedData
  };
};

export const existingLedgerFundingReducer = (
  protocolState: states.ExistingLedgerFundingState,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction
): ProtocolStateWithSharedData<states.ExistingLedgerFundingState> => {
  switch (protocolState.type) {
    case "ExistingLedgerFunding.WaitForLedgerUpdate":
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    case "ExistingLedgerFunding.WaitForLedgerTopUp":
      return waitForLedgerTopUpReducer(protocolState, sharedData, action);
  }
  return {protocolState, sharedData};
};

const waitForLedgerTopUpReducer = (
  protocolState: states.WaitForLedgerTopUp,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction
): ProtocolStateWithSharedData<states.ExistingLedgerFundingState> => {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    let consensusUpdateState: ConsensusUpdateState;
    ({protocolState: consensusUpdateState, sharedData} = consensusUpdateReducer(
      protocolState.consensusUpdateState,
      sharedData,
      action
    ));
    return {
      protocolState: {
        ...protocolState,
        consensusUpdateState
      },
      sharedData
    };
  } else if (routesToLedgerTopUp(action, protocolState.protocolLocator)) {
    const {protocolState: ledgerTopUpState, sharedData: newSharedData} = ledgerTopUpReducer(
      protocolState.ledgerTopUpState,
      sharedData,
      action
    );
    sharedData = newSharedData;

    if (ledgerTopUpState.type === "LedgerTopUp.Failure") {
      return {
        protocolState: states.failure({reason: "LedgerTopUpFailure"}),
        sharedData
      };
    } else if (ledgerTopUpState.type === "LedgerTopUp.Success") {
      const {protocolLocator, processId} = protocolState;
      let consensusUpdateState: ConsensusUpdateState;
      ({protocolState: consensusUpdateState, sharedData} = consensusUpdateReducer(
        protocolState.consensusUpdateState,
        sharedData,
        clearedToSend({
          protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
          processId
        })
      ));

      if (isTerminal(consensusUpdateState)) {
        return handleTerminalConsensusUpdate(
          protocolState.channelId,
          protocolState.ledgerId,
          consensusUpdateState,
          sharedData
        );
      } else {
        return {
          protocolState: states.waitForLedgerUpdate({
            ...protocolState,
            consensusUpdateState
          }),
          sharedData
        };
      }
    } else {
      return {
        protocolState: states.waitForLedgerTopUp({...protocolState, ledgerTopUpState}),
        sharedData
      };
    }
  } else {
    return {
      protocolState,
      sharedData
    };
  }
};

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction
) => {
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Expected Consensus Update action received ${action.type} instead`);
    return {protocolState, sharedData};
  }
  let consensusUpdateState: ConsensusUpdateState;
  ({sharedData, protocolState: consensusUpdateState} = consensusUpdateReducer(
    protocolState.consensusUpdateState,
    sharedData,
    action
  ));

  if (isTerminal(consensusUpdateState)) {
    return handleTerminalConsensusUpdate(
      protocolState.channelId,
      protocolState.ledgerId,
      consensusUpdateState,
      sharedData
    );
  } else {
    return {
      protocolState: {
        ...protocolState,
        consensusUpdateState
      },
      sharedData
    };
  }
};

function ledgerChannelNeedsTopUp(latestState: State, proposedOutcome: Outcome) {
  const {participants} = latestState.channel;
  if (latestState.isFinal || latestState.turnNum < 2 * participants.length - 1) {
    throw new Error("Ledger channel not open or already closed.");
  }

  const currentOutcome = latestState.outcome;
  const proposedAllocation = getAllocationOutcome(proposedOutcome).allocation;

  return proposedAllocation.some(p => {
    if (!outcomeContainsId(currentOutcome, p.destination)) {
      return false;
    }
    const currentAmount = getAllocationAmount(currentOutcome, p.destination);
    return bigNumberify(p.amount).gt(currentAmount);
  });
}

function craftAppFunding(
  appChannelId: string,
  ledgerChannelId: string,
  startingOutcome: Outcome,
  sharedData: SharedData
): Outcome {
  const {outcome: ledgerOutcome} = getLatestState(ledgerChannelId, sharedData);
  const ledgerAllocation = getAllocationOutcome(ledgerOutcome);
  const startingAllocation = getAllocationOutcome(startingOutcome);
  const appTotal = getAllocationTotal(startingOutcome);

  // If the ledger allocation is greater than the startingAllocation requested
  // we subtract the startingAllocation from the ledger allocation

  // TODO: Currently assuming ETH, this should be updated to handle any asset
  const newAllocation: AllocationAssetOutcome = {
    assetHolderAddress: startingAllocation.assetHolderAddress,
    allocation: []
  };

  newAllocation.allocation.push({destination: appChannelId, amount: appTotal});

  ledgerAllocation.allocation.forEach(a => {
    const startingAllocationItem = startingAllocation.allocation.find(
      s => s.destination === a.destination
    );
    const difference = !startingAllocationItem
      ? bigNumberify(0)
      : bigNumberify(a.amount).sub(startingAllocationItem.amount);
    if (difference.gt(0)) {
      newAllocation.allocation.push({destination: a.destination, amount: difference.toHexString()});
    }
  });

  return [newAllocation];
}

function handleTerminalConsensusUpdate(
  channelId: string,
  ledgerId: string,
  consensusUpdateState: TerminalConsensusUpdateState,
  sharedData: SharedData
) {
  if (consensusUpdateState.type === "ConsensusUpdate.Failure") {
    return {
      protocolState: states.failure({reason: "LedgerTopUpFailure"}),
      sharedData
    };
  } else {
    const fundingState: ChannelFundingState = {
      directlyFunded: false,
      fundingChannel: ledgerId
    };

    sharedData = setFundingState(sharedData, channelId, fundingState);
    return {
      protocolState: states.success({}),
      sharedData
    };
  }
}
