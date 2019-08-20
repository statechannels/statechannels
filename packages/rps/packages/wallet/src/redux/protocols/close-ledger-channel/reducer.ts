import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, makeLocator, EMPTY_LOCATOR } from '..';
import * as states from './states';
import * as helpers from '../reducer-helpers';
import { withdrawalReducer, initialize as withdrawalInitialize } from '../withdrawing/reducer';
import * as selectors from '../../selectors';
import * as actions from './actions';
import { isWithdrawalAction } from '../withdrawing/actions';
import { unreachable } from '../../../utils/reducer-utils';
import { EmbeddedProtocol } from '../../../communication';
import { getLastCommitment } from '../../channel-store';
import { ProtocolAction } from '../../actions';
import {
  AdvanceChannelState,
  initializeAdvanceChannel,
  advanceChannelReducer,
} from '../advance-channel';
import { CommitmentType } from '../../../domain';
import { WithdrawalState } from '../withdrawing/states';
import { routesToAdvanceChannel } from '../advance-channel/actions';

export const initialize = (
  processId: string,
  channelId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.CloseLedgerChannelState> => {
  if (helpers.channelFundsAnotherChannel(channelId, sharedData)) {
    return {
      protocolState: states.failure({ reason: 'Channel In Use' }),
      sharedData,
    };
  } else if (helpers.channelIsClosed(channelId, sharedData)) {
    return createWaitForWithdrawal(sharedData, processId, channelId);
  }

  let concluding: AdvanceChannelState;
  ({ protocolState: concluding, sharedData } = initializeAdvanceChannel(sharedData, {
    clearedToSend: true,
    processId,
    channelId,
    commitmentType: CommitmentType.Conclude,
    protocolLocator: makeLocator(EMPTY_LOCATOR, EmbeddedProtocol.AdvanceChannel),
    ourIndex: helpers.getTwoPlayerIndex(channelId, sharedData),
  }));
  return {
    protocolState: states.waitForConclude({ processId, channelId, concluding }),
    sharedData,
  };
};

export const closeLedgerChannelReducer = (
  protocolState: states.NonTerminalCloseLedgerChannelState,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<states.CloseLedgerChannelState> => {
  if (!actions.isCloseLedgerChannelAction(action)) {
    console.warn(`Close Ledger Channel reducer received non-close-channel action ${action.type}.`);
    return { protocolState, sharedData };
  }
  switch (protocolState.type) {
    case 'CloseLedgerChannel.WaitForWithdrawal':
      return waitForWithdrawalReducer(protocolState, sharedData, action);
    case 'CloseLedgerChannel.WaitForConclude':
      return waitForConcludeReducer(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
};

const waitForConcludeReducer = (
  protocolState: states.WaitForConclude,
  sharedData: SharedData,
  action: actions.CloseLedgerChannelAction,
) => {
  if (!routesToAdvanceChannel(action, EMPTY_LOCATOR)) {
    console.warn(`Expected advance channel action but received ${action.type}`);
    return { protocolState, sharedData };
  }
  let concluding: AdvanceChannelState;
  ({ protocolState: concluding, sharedData } = advanceChannelReducer(
    protocolState.concluding,
    sharedData,
    action,
  ));
  switch (concluding.type) {
    case 'AdvanceChannel.Success':
      return createWaitForWithdrawal(sharedData, protocolState.processId, protocolState.channelId);
    case 'AdvanceChannel.Failure':
      return { protocolState: states.failure({ reason: 'Advance Channel Failure' }), sharedData };
    default:
      return {
        protocolState: states.waitForConclude({ ...protocolState, concluding }),
        sharedData,
      };
  }
};

const waitForWithdrawalReducer = (
  protocolState: states.WaitForWithdrawal,
  sharedData: SharedData,
  action: actions.CloseLedgerChannelAction,
) => {
  if (!isWithdrawalAction(action)) {
    return { protocolState, sharedData };
  }
  let withdrawal: WithdrawalState;
  ({ protocolState: withdrawal, sharedData } = withdrawalReducer(
    protocolState.withdrawal,
    sharedData,
    action,
  ));
  switch (withdrawal.type) {
    case 'Withdrawing.Success':
      return {
        protocolState: states.success({}),
        sharedData: helpers.hideWallet(sharedData),
      };
    case 'Withdrawing.Failure':
      return {
        protocolState: states.failure({ reason: 'Withdrawal Failure' }),
        sharedData,
      };
    default:
      return {
        protocolState: states.waitForWithdrawal({
          ...protocolState,
          withdrawal,
        }),
        sharedData,
      };
  }
};

const createWaitForWithdrawal = (sharedData: SharedData, processId: string, channelId: string) => {
  const withdrawalAmount = getWithdrawalAmount(sharedData, channelId);
  let withdrawal: WithdrawalState;
  ({ protocolState: withdrawal, sharedData } = withdrawalInitialize(
    withdrawalAmount,
    channelId,
    processId,
    sharedData,
  ));

  const protocolState = states.waitForWithdrawal({
    processId,
    withdrawal,
    channelId,
  });

  return { protocolState, sharedData };
};
const getWithdrawalAmount = (sharedData: SharedData, channelId: string) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return getLastCommitment(channelState).allocation[channelState.ourIndex];
};
