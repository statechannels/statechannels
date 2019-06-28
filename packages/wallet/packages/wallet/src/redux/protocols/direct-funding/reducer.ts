import { bigNumberify } from 'ethers/utils';
import { unreachable } from '../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import * as actions from '../../actions';
import { ProtocolReducer, ProtocolStateWithSharedData, makeLocator } from '../../protocols';
import { SharedData } from '../../state';
import { isTransactionAction } from '../transaction-submission/actions';
import {
  initialize as initTransactionState,
  transactionReducer,
} from '../transaction-submission/reducer';
import { isTerminal, isSuccess } from '../transaction-submission/states';
import * as states from './states';
import * as advanceChannel from '../advance-channel';
import { DirectFundingRequested } from './actions';
import { CommitmentType } from '../../../domain';
import { clearedToSend } from '../advance-channel/actions';
import * as selectors from '../../selectors';
export const DIRECT_FUNDING_PROTOCOL_LOCATOR = 'DirectFunding';

type DFReducer = ProtocolReducer<states.DirectFundingState>;
const ADVANCE_CHANNEL_PROTOCOL_LOCATOR = makeLocator(
  DIRECT_FUNDING_PROTOCOL_LOCATOR,
  advanceChannel.ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
);

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
    exchangePostFundSetups,
  } = action;

  const existingChannelFunding = selectors.getAdjudicatorChannelBalance(sharedData, channelId);
  const alreadySafeToDeposit = bigNumberify(existingChannelFunding).gte(safeToDepositLevel);
  const alreadyFunded = bigNumberify(totalFundingRequired).eq('0x');
  const depositNotRequired = bigNumberify(requiredDeposit).eq('0x');
  const commitmentType = CommitmentType.PostFundSetup;

  const {
    protocolState: postFundSetupState,
    sharedData: newSharedData,
  } = advanceChannel.initializeAdvanceChannel(processId, sharedData, commitmentType, {
    channelId,
    ourIndex,
    processId,
    commitmentType,
    clearedToSend: (alreadyFunded || depositNotRequired) && exchangePostFundSetups,
    protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
  });
  sharedData = newSharedData;

  if (alreadyFunded) {
    return {
      protocolState: states.fundingSuccess({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        exchangePostFundSetups,
        postFundSetupState,
      }),
      sharedData,
    };
  }
  if (depositNotRequired) {
    return {
      protocolState: states.waitForFundingAndPostFundSetup({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        exchangePostFundSetups,
        postFundSetupState,
        channelFunded: false,
        postFundSetupReceived: false,
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
        exchangePostFundSetups,
        postFundSetupState,
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
      exchangePostFundSetups,
      postFundSetupState,
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

  if (advanceChannel.isAdvanceChannelAction(action)) {
    return commitmentsReceivedReducer(state, sharedData, action);
  }

  switch (state.type) {
    case 'DirectFunding.NotSafeToDeposit':
      return notSafeToDepositReducer(state, sharedData, action);
    case 'DirectFunding.WaitForDepositTransaction':
      return waitForDepositTransactionReducer(state, sharedData, action);
    case 'DirectFunding.WaitForFundingAndPostFundSetup':
      return waitForFundingAndPostFundSetupReducer(state, sharedData, action);
    case 'DirectFunding.FundingSuccess':
      return channelFundedReducer(state, sharedData, action);
    case 'DirectFunding.FundingFailure':
      // todo: restrict the reducer to only accept non-terminal states
      return { protocolState: state, sharedData };
    default:
      return unreachable(state);
  }
};

const commitmentsReceivedReducer: DFReducer = (
  protocolState: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.FundingReceivedEvent,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (!protocolState.exchangePostFundSetups) {
    console.warn(
      `Direct Funding reducer received ${
        action.type
      } even though 'exchangePostFundSetups' is set to false.`,
    );
    return { protocolState, sharedData };
  }
  const {
    protocolState: postFundSetupState,
    sharedData: newSharedData,
  } = advanceChannel.advanceChannelReducer(protocolState.postFundSetupState, sharedData, action);

  if (postFundSetupState.type === 'AdvanceChannel.Success' && channelIsFunded(protocolState)) {
    return {
      protocolState: states.fundingSuccess({ ...protocolState, postFundSetupState }),
      sharedData: newSharedData,
    };
  } else if (channelIsFunded(protocolState)) {
    return {
      protocolState: states.waitForFundingAndPostFundSetup({
        ...protocolState,
        postFundSetupState,
        channelFunded: true,
      }),
      sharedData: newSharedData,
    };
  } else {
    return {
      protocolState: states.waitForFundingAndPostFundSetup({
        ...protocolState,
        postFundSetupState,
        channelFunded: false,
      }),
      sharedData: newSharedData,
    };
  }
};

function channelIsFunded(protocolState: states.DirectFundingState) {
  if ('channelFunded' in protocolState) {
    return protocolState.channelFunded;
  }

  return false;
}

// Action reducers
const fundingConfirmedReducer: DFReducer = (
  protocolState: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.FundingReceivedEvent,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  // TODO[Channel state side effect]: update funding level for the channel.

  // If we are not exchanging post fund setups we can return success now that we're funded
  if (!protocolState.exchangePostFundSetups) {
    return {
      protocolState: states.fundingSuccess(protocolState),
      sharedData,
    };
  }

  // If we are exchanging post fund setups we alert the advanceChannelReducer that it is clearedToSend
  const {
    protocolState: postFundSetupState,
    sharedData: newSharedData,
  } = advanceChannel.advanceChannelReducer(
    protocolState.postFundSetupState,
    sharedData,
    clearedToSend({
      processId: action.processId,
      protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
    }),
  );

  if (postFundSetupState.type === 'AdvanceChannel.Success') {
    return {
      protocolState: states.fundingSuccess({ ...protocolState, postFundSetupState }),
      sharedData: newSharedData,
    };
  } else {
    return {
      protocolState: states.waitForFundingAndPostFundSetup({
        ...protocolState,
        postFundSetupState,
        channelFunded: true,
      }),
      sharedData: newSharedData,
    };
  }
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
        protocolState: states.waitForFundingAndPostFundSetup({
          ...protocolState,
          channelFunded: false,
          postFundSetupReceived: false,
        }),
        sharedData,
      };
    } else {
      return { protocolState: states.fundingFailure(protocolState), sharedData };
    }
  }
};

const waitForFundingAndPostFundSetupReducer: DFReducer = (
  protocolState: states.WaitForFundingAndPostFundSetup,
  sharedData: SharedData,
  action: actions.WalletAction,
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
