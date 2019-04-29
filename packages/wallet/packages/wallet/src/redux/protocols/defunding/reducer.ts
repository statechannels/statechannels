import { SharedData } from '../../state';
import { ProtocolStateWithSharedData } from '..';
import * as states from './state';
import { DefundingAction } from './actions';
import * as helpers from '../reducer-helpers';
import { withdrawalReducer, initialize as withdrawalInitialize } from './../withdrawing/reducer';
import * as selectors from '../../selectors';
import * as actions from './actions';
import { isWithdrawalAction } from '../withdrawing/actions';
import { SUCCESS, FAILURE } from '../withdrawing/states';
import { unreachable } from '../../../utils/reducer-utils';

export const initialize = (
  processId: string,
  channelId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.DefundingState> => {
  if (!helpers.channelIsClosed(channelId, sharedData)) {
    return { protocolState: states.failure('Channel Not Closed'), sharedData };
  }
  if (helpers.isChannelDirectlyFunded(channelId, sharedData)) {
    return createWaitForWithdrawal(sharedData, processId, channelId);
  } else {
    const protocolState = states.waitForLedgerDefunding({
      processId,
      ledgerDefundingState: 'Started',
    });
    return { protocolState, sharedData };
  }
};

export const defundingReducer = (
  protocolState: states.DefundingState,
  sharedData: SharedData,
  action: DefundingAction,
): ProtocolStateWithSharedData<states.DefundingState> => {
  switch (protocolState.type) {
    case states.WAIT_FOR_WITHDRAWAL:
      return waitForWithdrawalReducer(protocolState, sharedData, action);
    case states.FAILURE:
    case states.SUCCESS:
    case states.WAIT_FOR_LEDGER_DEFUNDING:
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
  return { protocolState, sharedData };
};

const waitForWithdrawalReducer = (
  protocolState: states.WaitForWithdrawal,
  sharedData: SharedData,
  action: actions.DefundingAction,
) => {
  if (!isWithdrawalAction(action)) {
    return { protocolState, sharedData };
  }
  const { protocolState: newWithdrawalState, sharedData: newSharedData } = withdrawalReducer(
    protocolState.withdrawalState,
    sharedData,
    action,
  );
  if (newWithdrawalState.type === SUCCESS) {
    return {
      protocolState: states.success(),
      sharedData: newSharedData,
    };
  } else if (newWithdrawalState.type === FAILURE) {
    return {
      protocolState: states.failure('Withdrawal Failure'),
      sharedData: newSharedData,
    };
  } else {
    return {
      protocolState: states.waitForWithdrawal({
        ...protocolState,
        withdrawalState: newWithdrawalState,
      }),
      sharedData: newSharedData,
    };
  }
};

const createWaitForWithdrawal = (sharedData: SharedData, processId: string, channelId: string) => {
  const withdrawalAmount = getWithdrawalAmount(sharedData, channelId);

  const { protocolState: withdrawalState, sharedData: newSharedData } = withdrawalInitialize(
    withdrawalAmount,
    channelId,
    processId,
    sharedData,
  );

  const protocolState = states.waitForWithdrawal({
    processId,
    withdrawalState,
  });

  return { protocolState, sharedData: newSharedData };
};
const getWithdrawalAmount = (sharedData: SharedData, channelId: string) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.lastCommitment.commitment.allocation[channelState.ourIndex];
};
