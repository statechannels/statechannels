import {SharedData} from "../../state";

import * as helpers from "../reducer-helpers";
import {withdrawalReducer, initialize as withdrawalInitialize} from "../withdrawing/reducer";
import * as selectors from "../../selectors";

import {isWithdrawalAction} from "../withdrawing/actions";
import {unreachable} from "../../../utils/reducer-utils";
import {EmbeddedProtocol, ProtocolLocator} from "../../../communication";
import {getLastState} from "../../channel-store";
import {ProtocolAction} from "../../actions";
import {
  AdvanceChannelState,
  initializeAdvanceChannel,
  advanceChannelReducer
} from "../advance-channel";
import {WithdrawalState} from "../withdrawing/states";
import {routesToAdvanceChannel, clearedToSend} from "../advance-channel/actions";
import {StateType} from "../advance-channel/states";
import {getAllocationAmountForIndex} from "../../../utils/outcome-utils";
import {TwoPartyPlayerIndex} from "../../types";
import * as withdrawalStates from "../withdrawing/states";

import * as actions from "./actions";
import * as states from "./states";

import {ProtocolStateWithSharedData, makeLocator, EMPTY_LOCATOR} from "..";

export const initialize = (
  processId: string,
  channelId: string,
  sharedData: SharedData,
  clearedToSend: boolean,
  protocolLocator: ProtocolLocator = EMPTY_LOCATOR
): ProtocolStateWithSharedData<states.CloseLedgerChannelState> => {
  if (helpers.channelFundsAnotherChannel(channelId, sharedData)) {
    return {
      protocolState: states.failure({reason: "Channel In Use"}),
      sharedData
    };
  } else if (helpers.channelIsClosed(channelId, sharedData)) {
    return createWaitForWithdrawal(sharedData, processId, channelId, protocolLocator);
  }

  let concluding: AdvanceChannelState;
  ({protocolState: concluding, sharedData} = initializeAdvanceChannel(sharedData, {
    clearedToSend,
    processId,
    channelId,
    stateType: StateType.Conclude,
    protocolLocator: makeLocator(protocolLocator, EmbeddedProtocol.AdvanceChannel),
    ourIndex: helpers.getTwoPlayerIndex(channelId, sharedData)
  }));
  return {
    protocolState: states.waitForConclude({processId, channelId, concluding, protocolLocator}),
    sharedData
  };
};

export const closeLedgerChannelReducer = (
  protocolState: states.NonTerminalCloseLedgerChannelState,
  sharedData: SharedData,
  action: ProtocolAction
): ProtocolStateWithSharedData<states.CloseLedgerChannelState> => {
  if (!actions.isCloseLedgerChannelAction(action)) {
    console.warn(`Close Ledger Channel reducer received non-close-channel action ${action.type}.`);
    return {protocolState, sharedData};
  }
  switch (protocolState.type) {
    case "CloseLedgerChannel.WaitForWithdrawal":
      return waitForWithdrawalReducer(protocolState, sharedData, action);
    case "CloseLedgerChannel.WaitForConclude":
      return waitForConcludeReducer(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
};

const waitForConcludeReducer = (
  protocolState: states.WaitForConclude,
  sharedData: SharedData,
  action: actions.CloseLedgerChannelAction
) => {
  if (action.type === "WALLET.CLOSE_LEDGER_CHANNEL.CLEARED_TO_SEND") {
    action = clearedToSend({
      processId: action.processId,
      protocolLocator: makeLocator(protocolState.protocolLocator, EmbeddedProtocol.AdvanceChannel)
    });
  }
  if (!routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    console.warn(`Expected advance channel action but received ${action.type}`);
    return {protocolState, sharedData};
  }

  let concluding: AdvanceChannelState;
  ({protocolState: concluding, sharedData} = advanceChannelReducer(
    protocolState.concluding,
    sharedData,
    action
  ));
  switch (concluding.type) {
    case "AdvanceChannel.Success":
      // TODO: This is not very robust but should be good enough for now.
      // We only call the `concludePushOutcome` if we're player A. Since the second call will fail.
      // This should mostly be fine for virtual Funding (since we're always player A)
      // but will be an issue with IndirectFunding as player B is at the mercy of player A
      // see https://github.com/statechannels/monorepo/issues/761
      if (
        helpers.getTwoPlayerIndex(protocolState.channelId, sharedData) === TwoPartyPlayerIndex.A
      ) {
        return createWaitForWithdrawal(
          sharedData,
          protocolState.processId,
          protocolState.channelId,
          protocolState.protocolLocator
        );
      } else {
        // TODO: wait until player A's transaction is submitted before moving to success
        return {
          protocolState: states.waitForWithdrawal({
            ...protocolState,
            withdrawal: withdrawalStates.waitForAcknowledgement({
              channelId: protocolState.channelId,
              processId: protocolState.processId
            })
          }),
          sharedData
        };
      }
    case "AdvanceChannel.Failure":
      return {protocolState: states.failure({reason: "Advance Channel Failure"}), sharedData};
    default:
      return {
        protocolState: states.waitForConclude({...protocolState, concluding}),
        sharedData
      };
  }
};

const waitForWithdrawalReducer = (
  protocolState: states.WaitForWithdrawal,
  sharedData: SharedData,
  action: actions.CloseLedgerChannelAction
) => {
  if (!isWithdrawalAction(action)) {
    return {protocolState, sharedData};
  }
  let withdrawal: WithdrawalState;
  ({protocolState: withdrawal, sharedData} = withdrawalReducer(
    protocolState.withdrawal,
    sharedData,
    action
  ));
  switch (withdrawal.type) {
    case "Withdrawing.Success":
      return {
        protocolState: states.success({}),
        sharedData: helpers.hideWallet(sharedData)
      };
    case "Withdrawing.Failure":
      return {
        protocolState: states.failure({reason: "Withdrawal Failure"}),
        sharedData
      };
    default:
      return {
        protocolState: states.waitForWithdrawal({
          ...protocolState,
          withdrawal
        }),
        sharedData
      };
  }
};

const createWaitForWithdrawal = (
  sharedData: SharedData,
  processId: string,
  channelId: string,
  protocolLocator: ProtocolLocator
) => {
  const withdrawalAmount = getWithdrawalAmount(sharedData, channelId);
  let withdrawal: WithdrawalState;
  ({protocolState: withdrawal, sharedData} = withdrawalInitialize(
    withdrawalAmount,
    channelId,
    processId,
    sharedData
  ));

  const protocolState = states.waitForWithdrawal({
    processId,
    withdrawal,
    channelId,
    protocolLocator
  });

  return {protocolState, sharedData};
};
const getWithdrawalAmount = (sharedData: SharedData, channelId: string) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  const lastState = getLastState(channelState);
  return getAllocationAmountForIndex(lastState.outcome, channelState.ourIndex);
};
