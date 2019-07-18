import { bigNumberify } from 'ethers/utils';
import { unreachable } from '../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import * as actions from '../../actions';
import { ProtocolReducer, ProtocolStateWithSharedData } from '../../protocols';
import { SharedData } from '../../state';
import { isTransactionAction } from '../transaction-submission/actions';
import {
  initialize as initTransactionState,
  transactionReducer,
} from '../transaction-submission/reducer';
import { isTerminal, isSuccess } from '../transaction-submission/states';
import * as states from './states';
import { DirectFundingRequested } from './actions';
import * as selectors from '../../selectors';

type DFReducer = ProtocolReducer<states.DirectFundingState>;

export function initialize(
  action: DirectFundingRequested,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.DirectFundingState> {
  const {
    safeToDepositLevel,
    totalFundingRequired,
    requiredDeposit,
    channelId,
    ourIndex,
    processId,
  } = action;

  const existingChannelFunding = selectors.getAdjudicatorChannelBalance(sharedData, channelId);
  const alreadySafeToDeposit = bigNumberify(existingChannelFunding).gte(safeToDepositLevel);
  const alreadyFunded = bigNumberify(totalFundingRequired).eq('0x');
  const depositNotRequired = bigNumberify(requiredDeposit).eq('0x');

  if (alreadyFunded) {
    return {
      protocolState: states.fundingSuccess({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
      }),
      sharedData,
    };
  }
  if (depositNotRequired) {
    return {
      protocolState: states.waitForFunding({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
      }),
      sharedData,
    };
  }

  if (alreadySafeToDeposit) {
    const depositTransaction = createDepositTransaction(
      action.channelId,
      action.requiredDeposit,
      existingChannelFunding,
    );
    const { storage: newStorage, state: transactionSubmissionState } = initTransactionState(
      depositTransaction,
      action.processId,
      action.channelId,
      sharedData,
    );

    return {
      protocolState: states.waitForDepositTransaction({
        processId: action.processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        transactionSubmissionState,
      }),
      sharedData: newStorage,
    };
  }

  return {
    protocolState: states.notSafeToDeposit({
      processId: action.processId,
      totalFundingRequired,
      requiredDeposit,
      channelId,
      ourIndex,
      safeToDepositLevel,
    }),
    sharedData,
  };
}

export const directFundingStateReducer: DFReducer = (
  state: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (
    action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' &&
    action.channelId === state.channelId
  ) {
    if (bigNumberify(action.totalForDestination).gte(state.totalFundingRequired)) {
      return fundingConfirmedReducer(state, sharedData, action);
    }
  }

  switch (state.type) {
    case 'DirectFunding.NotSafeToDeposit':
      return notSafeToDepositReducer(state, sharedData, action);
    case 'DirectFunding.WaitForDepositTransaction':
      return waitForDepositTransactionReducer(state, sharedData, action);
    case 'DirectFunding.WaitForFunding':
      return waitForFundingReducer(state, sharedData, action);
    case 'DirectFunding.FundingSuccess':
      return channelFundedReducer(state, sharedData, action);
    case 'DirectFunding.FundingFailure':
      // todo: restrict the reducer to only accept non-terminal states
      return { protocolState: state, sharedData };
    default:
      return unreachable(state);
  }
};

// Action reducers
const fundingConfirmedReducer: DFReducer = (
  protocolState: states.DirectFundingState,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  // TODO[Channel state side effect]: update funding level for the channel.

  return {
    protocolState: states.fundingSuccess(protocolState),
    sharedData,
  };
};

// State reducers
const notSafeToDepositReducer: DFReducer = (
  state: states.NotSafeToDeposit,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  switch (action.type) {
    case 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT':
      if (
        action.channelId === state.channelId &&
        bigNumberify(action.totalForDestination).gte(state.safeToDepositLevel)
      ) {
        const existingChannelFunding = selectors.getAdjudicatorChannelBalance(
          sharedData,
          state.channelId,
        );
        const depositTransaction = createDepositTransaction(
          state.channelId,
          state.requiredDeposit,
          existingChannelFunding,
        );

        const {
          storage: sharedDataWithTransactionState,
          state: transactionSubmissionState,
        } = initTransactionState(depositTransaction, state.processId, state.channelId, sharedData);
        return {
          protocolState: states.waitForDepositTransaction({ ...state, transactionSubmissionState }),
          sharedData: sharedDataWithTransactionState,
        };
      } else {
        return { protocolState: state, sharedData };
      }
    default:
      return { protocolState: state, sharedData };
  }
};

const waitForDepositTransactionReducer: DFReducer = (
  protocolState: states.WaitForDepositTransaction,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (!isTransactionAction(action)) {
    return { protocolState, sharedData };
  }
  const {
    storage: sharedDataWithTransactionUpdate,
    state: newTransactionState,
  } = transactionReducer(protocolState.transactionSubmissionState, sharedData, action);
  if (!isTerminal(newTransactionState)) {
    return {
      sharedData: sharedDataWithTransactionUpdate,
      protocolState: { ...protocolState, transactionSubmissionState: newTransactionState },
    };
  } else {
    if (isSuccess(newTransactionState)) {
      return {
        protocolState: states.waitForFunding(protocolState),
        sharedData,
      };
    } else {
      return { protocolState: states.fundingFailure(protocolState), sharedData };
    }
  }
};

const waitForFundingReducer: DFReducer = (
  protocolState: states.WaitForFunding,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  return { protocolState, sharedData };
};

const channelFundedReducer: DFReducer = (
  state: states.FundingSuccess,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT') {
    if (bigNumberify(action.totalForDestination).lt(state.totalFundingRequired)) {
      // TODO: Deal with chain re-orgs that de-fund the channel here
      return { protocolState: state, sharedData };
    }
  }
  return { protocolState: state, sharedData };
};
