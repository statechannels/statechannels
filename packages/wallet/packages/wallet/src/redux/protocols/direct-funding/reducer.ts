import { bigNumberify } from 'ethers/utils';
import { Commitment } from 'fmg-core';
import { messageRelayRequested } from 'magmo-wallet-client';
import { composePostFundCommitment } from '../../../utils/commitment-utils';
import { unreachable } from '../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import * as actions from '../../actions';
import * as channelActions from '../../channel-state/actions';
import * as channelStates from '../../channel-state/state';
import { ProtocolReducer, ProtocolStateWithSharedData } from '../../protocols';
import * as selectors from '../../selectors';
import { SharedData } from '../../state';
import { WalletProtocol, PlayerIndex } from '../../types';
import { updateChannelState } from '../reducer-helpers';
import { isTransactionAction } from '../transaction-submission/actions';
import {
  initialize as initTransactionState,
  transactionReducer,
} from '../transaction-submission/reducer';
import { isTerminal, isSuccess } from '../transaction-submission/states';
import * as states from './state';

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
    default:
      return unreachable(state);
  }
};

// Action reducers
const fundingReceiveEventReducer: DFReducer = (
  state: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.FundingReceivedEvent,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  // If we are player A, the channel is now funded, so we should send the PostFundSetup
  if (state.ourIndex === PlayerIndex.A) {
    const newSharedData = createAndSendPostFundCommitment(sharedData, state.channelId);
    return {
      protocolState: states.waitForFundingAndPostFundSetup(state, {
        channelFunded: true,
        postFundSetupReceived: false,
      }),
      sharedData: newSharedData,
    };
  }

  // Player B case
  if (state.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP && state.postFundSetupReceived) {
    // TODO: Need to send post fund setup for player B
    return {
      protocolState: states.fundingSuccess(state),
      sharedData,
    };
  }
  return {
    protocolState: states.waitForFundingAndPostFundSetup(state, {
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
  const newSharedData = updateChannelState(sharedData, action);

  if (protocolState.ourIndex === PlayerIndex.A) {
    if (
      protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP &&
      protocolState.channelFunded
    ) {
      return { protocolState: states.fundingSuccess(protocolState), sharedData: newSharedData };
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
    // TODO: need to send PostFund setup
    return { protocolState: states.fundingSuccess(protocolState), sharedData: newSharedData };
  } else {
    return {
      protocolState: states.waitForFundingAndPostFundSetup(protocolState, {
        channelFunded: false,
        postFundSetupReceived: true,
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
    case actions.FUNDING_RECEIVED_EVENT:
      if (
        action.channelId === state.channelId &&
        bigNumberify(action.totalForDestination).gte(state.safeToDepositLevel)
      ) {
        const depositTransaction = createDepositTransaction(
          state.channelId,
          state.requestedYourContribution,
        );

        const { storage: newSharedData, state: transactionSubmissionState } = initTransactionState(
          depositTransaction,
          `direct-funding.${action.channelId}`, // TODO: what is the correct way of fetching the process id?
          sharedData,
        );
        return {
          protocolState: states.waitForDepositTransaction({ ...state, transactionSubmissionState }),
          sharedData: newSharedData,
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
  const { storage: newSharedData, state: newTransactionState } = transactionReducer(
    protocolState.transactionSubmissionState,
    sharedData,
    action,
  );
  if (!isTerminal(newTransactionState)) {
    return {
      sharedData: newSharedData,
      protocolState: { ...protocolState, transactionSubmissionState: newTransactionState },
    };
  } else {
    if (isSuccess(newTransactionState)) {
      return {
        protocolState: states.waitForFundingAndPostFundSetup(protocolState, {
          channelFunded: false,
          postFundSetupReceived: false,
        }),
        sharedData,
      };
    } else {
      // TODO: treat the transaction failure case
      return { protocolState, sharedData };
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

  const { commitment, signature } = composePostFundCommitment(
    channelState.lastCommitment.commitment,
    channelState.ourIndex,
    channelState.privateKey,
  );

  let newSharedData = updateChannelState(
    sharedData,
    // TODO: this might not be the correct action to use
    channelActions.ownCommitmentReceived(commitment),
  );

  newSharedData = {
    ...newSharedData,
    outboxState: {
      ...newSharedData.outboxState,
      messageOutbox: [
        createCommitmentMessageRelay(theirAddress(channelState), channelId, commitment, signature),
      ],
    },
  };
  return newSharedData;
};

const createCommitmentMessageRelay = (
  to: string,
  processId: string,
  commitment: Commitment,
  signature: string,
) => {
  const payload = {
    protocol: WalletProtocol.DirectFunding,
    data: { commitment, signature, processId },
  };
  return messageRelayRequested(to, payload);
};

function theirAddress(channelState: channelStates.OpenedState) {
  const theirIndex = (channelState.ourIndex + 1) % channelState.participants.length;
  return channelState.participants[theirIndex];
}
