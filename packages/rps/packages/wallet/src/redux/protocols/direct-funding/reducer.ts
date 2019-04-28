import { bigNumberify } from 'ethers/utils';
import { composePostFundCommitment } from '../../../utils/commitment-utils';
import { unreachable } from '../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import * as actions from '../../actions';
import { ProtocolReducer, ProtocolStateWithSharedData } from '../../protocols';
import * as selectors from '../../selectors';
import { SharedData, setChannelStore, queueMessage } from '../../state';
import { PlayerIndex } from '../../types';
import { isTransactionAction } from '../transaction-submission/actions';
import {
  initialize as initTransactionState,
  transactionReducer,
} from '../transaction-submission/reducer';
import { isTerminal, isSuccess } from '../transaction-submission/states';
import * as states from './state';
import { createCommitmentMessageRelay } from '../reducer-helpers';
import { theirAddress } from '../../channel-store';
import * as channelStoreReducer from '../../channel-store/reducer';

type DFReducer = ProtocolReducer<states.DirectFundingState>;

export const directFundingStateReducer: DFReducer = (
  state: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === actions.FUNDING_RECEIVED_EVENT && action.channelId === state.channelId) {
    if (bigNumberify(action.totalForDestination).gte(state.requestedTotalFunds)) {
      return fundingReceiveEventReducer(state, sharedData, action);
    }
  }

  if (action.type === actions.COMMITMENT_RECEIVED) {
    return commitmentReceivedReducer(state, sharedData, action);
  }

  switch (state.type) {
    case states.NOT_SAFE_TO_DEPOSIT:
      return notSafeToDepositReducer(state, sharedData, action);
    case states.WAIT_FOR_DEPOSIT_TRANSACTION:
      return waitForDepositTransactionReducer(state, sharedData, action);
    case states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      return waitForFundingAndPostFundSetupReducer(state, sharedData, action);
    case states.FUNDING_SUCCESS:
      return channelFundedReducer(state, sharedData, action);
    case states.FUNDING_FAILURE:
      // todo: restrict the reducer to only accept non-terminal states
      return { protocolState: state, sharedData };
    default:
      return unreachable(state);
  }
};

// Action reducers
const fundingReceiveEventReducer: DFReducer = (
  protocolState: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.FundingReceivedEvent,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  // TODO[Channel state side effect]: update funding level for the channel.

  // If we are player A, the channel is now funded, so we should send the PostFundSetup
  if (protocolState.ourIndex === PlayerIndex.A) {
    const sharedDataWithOwnCommitment = createAndSendPostFundCommitment(
      sharedData,
      protocolState.channelId,
    );
    return {
      protocolState: states.waitForFundingAndPostFundSetup({
        ...protocolState,
        channelFunded: true,
        postFundSetupReceived: false,
      }),
      sharedData: sharedDataWithOwnCommitment,
    };
  }

  // Player B case
  if (
    protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP &&
    protocolState.postFundSetupReceived
  ) {
    const sharedDataWithOwnCommitment = createAndSendPostFundCommitment(
      sharedData,
      protocolState.channelId,
    );
    return {
      protocolState: states.fundingSuccess(protocolState),
      sharedData: sharedDataWithOwnCommitment,
    };
  }
  return {
    protocolState: states.waitForFundingAndPostFundSetup({
      ...protocolState,
      channelFunded: true,
      postFundSetupReceived: false,
    }),
    sharedData,
  };
};

const commitmentReceivedReducer: DFReducer = (
  protocolState: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.CommitmentReceived,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (protocolState.ourIndex === PlayerIndex.A) {
    if (
      protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP &&
      protocolState.channelFunded
    ) {
      const checkResult = channelStoreReducer.checkAndStore(
        sharedData.channelStore,
        action.signedCommitment,
      );
      if (!checkResult.isSuccess) {
        throw new Error(
          'Direct funding protocol, commitmentReceivedReducer: unable to validate commitment',
        );
      }
      const sharedDataWithReceivedCommitment = setChannelStore(sharedData, checkResult.store);
      return {
        protocolState: states.fundingSuccess(protocolState),
        sharedData: sharedDataWithReceivedCommitment,
      };
    } else {
      // In this case: Player B sent a PostFund commitment before Player A sent a PostFund commitment.
      // Ignore the Player B PostFund commitment.
      return { protocolState, sharedData };
    }
  }

  // Player B logic
  if (
    protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP &&
    protocolState.channelFunded
  ) {
    const checkResult = channelStoreReducer.checkAndStore(
      sharedData.channelStore,
      action.signedCommitment,
    );
    if (!checkResult.isSuccess) {
      throw new Error(
        'Direct funding protocol, commitmentReceivedReducer: unable to validate commitment',
      );
    }

    const sharedDataWithReceivedCommitment = setChannelStore(sharedData, checkResult.store);
    const sharedDataWithOwnCommitment = createAndSendPostFundCommitment(
      sharedDataWithReceivedCommitment,
      protocolState.channelId,
    );
    return {
      protocolState: states.fundingSuccess(protocolState),
      sharedData: sharedDataWithOwnCommitment,
    };
  } else {
    return {
      protocolState: states.waitForFundingAndPostFundSetup({
        ...protocolState,
        channelFunded: false,
        postFundSetupReceived: true,
      }),
      sharedData,
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
    case actions.FUNDING_RECEIVED_EVENT:
      if (
        action.channelId === state.channelId &&
        bigNumberify(action.totalForDestination).gte(state.safeToDepositLevel)
      ) {
        const depositTransaction = createDepositTransaction(
          state.channelId,
          state.requestedYourContribution,
        );

        const {
          storage: sharedDataWithTransactionState,
          state: transactionSubmissionState,
        } = initTransactionState(depositTransaction, state.processId, sharedData);
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
  if (action.type === actions.FUNDING_RECEIVED_EVENT) {
    if (bigNumberify(action.totalForDestination).lt(state.requestedTotalFunds)) {
      // TODO: Deal with chain re-orgs that de-fund the channel here
      return { protocolState: state, sharedData };
    }
  }
  return { protocolState: state, sharedData };
};

// Helpers
const createAndSendPostFundCommitment = (sharedData: SharedData, channelId: string): SharedData => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);

  const commitment = composePostFundCommitment(
    channelState.lastCommitment.commitment,
    channelState.ourIndex,
  );

  const signResult = channelStoreReducer.signAndStore(sharedData.channelStore, commitment);
  if (signResult.isSuccess) {
    const sharedDataWithOwnCommitment = setChannelStore(sharedData, signResult.store);
    const messageRelay = createCommitmentMessageRelay(
      theirAddress(channelState),
      channelId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
    );
    return queueMessage(sharedDataWithOwnCommitment, messageRelay);
  } else {
    throw new Error(
      `Direct funding protocol, createAndSendPostFundCommitment, unable to sign commitment: ${
        signResult.reason
      }`,
    );
  }
};
