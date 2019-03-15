import * as states from '../../states/channels';
import * as actions from '../../actions';
import {
  messageRelayRequested,
  fundingSuccess,
  fundingFailure,
  showWallet,
  hideWallet,
  commitmentRelayRequested,
} from 'magmo-wallet-client/lib/wallet-events';

import { unreachable, validTransition } from '../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';

import { Channel, Commitment, CommitmentType } from 'fmg-core';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { bigNumberify } from 'ethers/utils';
import { NextChannelState } from '../../states/shared';

export const fundingReducer = (
  state: states.FundingState,
  action: actions.WalletAction,
  unhandledAction?: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (
    action.type === actions.OWN_COMMITMENT_RECEIVED ||
    action.type === actions.OPPONENT_COMMITMENT_RECEIVED
  ) {
    return {
      channelState: state,
      outboxState: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
    };
  }
  switch (state.type) {
    case states.WAIT_FOR_FUNDING_REQUEST:
      return waitForFundingRequestReducer(state, action);
    case states.APPROVE_FUNDING:
      return approveFundingReducer(state, action, unhandledAction);
    //
    case states.A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
      return aWaitForDepositToBeSentToMetaMaskReducer(state, action);
    case states.A_SUBMIT_DEPOSIT_IN_METAMASK:
      return aSubmitDepositToMetaMaskReducer(state, action);
    case states.A_WAIT_FOR_DEPOSIT_CONFIRMATION:
      return aWaitForDepositConfirmationReducer(state, action, unhandledAction);
    case states.A_WAIT_FOR_OPPONENT_DEPOSIT:
      return aWaitForOpponentDepositReducer(state, action);
    case states.A_WAIT_FOR_POST_FUND_SETUP:
      return aWaitForPostFundSetupReducer(state, action);
    //
    case states.B_WAIT_FOR_OPPONENT_DEPOSIT:
      return bWaitForOpponentDepositReducer(state, action);
    case states.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
      return bWaitForDepositToBeSentToMetaMaskReducer(state, action);
    case states.B_SUBMIT_DEPOSIT_IN_METAMASK:
      return bSubmitDepositInMetaMaskReducer(state, action);
    case states.B_WAIT_FOR_DEPOSIT_CONFIRMATION:
      return bWaitForDepositConfirmationReducer(state, action, unhandledAction);
    case states.B_WAIT_FOR_POST_FUND_SETUP:
      return bWaitForPostFundSetupReducer(state, action);
    //
    case states.ACKNOWLEDGE_FUNDING_SUCCESS:
      return acknowledgeFundingSuccessReducer(state, action);
    case states.SEND_FUNDING_DECLINED_MESSAGE:
      return sendFundingDeclinedMessageReducer(state, action);
    case states.ACKNOWLEDGE_FUNDING_DECLINED:
      return acknowledgeFundingDeclinedReducer(state, action);
    //
    case states.A_DEPOSIT_TRANSACTION_FAILED:
      return aDepositTransactionFailedReducer(state, action);
    case states.B_DEPOSIT_TRANSACTION_FAILED:
      return bDepositTransactionFailedReducer(state, action);
    default:
      return unreachable(state);
  }
};

const aDepositTransactionFailedReducer = (
  state: states.ADepositTransactionFailed,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const fundingAmount = getFundingAmount(state, state.ourIndex);
      return {
        channelState: states.aWaitForDepositToBeSentToMetaMask({
          ...state,
        }),
        outboxState: {
          transactionOutbox: createDepositTransaction(state.channelId, fundingAmount),
        },
      };
  }
  return { channelState: state };
};

const bDepositTransactionFailedReducer = (
  state: states.BDepositTransactionFailed,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const fundingAmount = getFundingAmount(state, state.ourIndex);
      return {
        channelState: states.bWaitForDepositToBeSentToMetaMask({ ...state }),
        outboxState: {
          transactionOutbox: createDepositTransaction(state.channelId, fundingAmount),
        },
      };
  }
  return { channelState: state };
};

const acknowledgeFundingDeclinedReducer = (
  state: states.AcknowledgeFundingDeclined,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return {
        channelState: states.waitForChannel({
          ...state,
        }),
        outboxState: {
          messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
          displayOutbox: hideWallet(),
        },
      };
  }
  return { channelState: state };
};

const sendFundingDeclinedMessageReducer = (
  state: states.SendFundingDeclinedMessage,
  action: actions.WalletAction,
): NextChannelState<states.WaitForChannel | states.SendFundingDeclinedMessage> => {
  switch (action.type) {
    case actions.MESSAGE_SENT:
      return {
        channelState: states.waitForChannel({
          ...state,
        }),
        outboxState: {
          messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
          displayOutbox: hideWallet(),
        },
      };
  }
  return { channelState: state };
};

const waitForFundingRequestReducer = (
  state: states.WaitForFundingRequest,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_REQUESTED:
      return {
        channelState: states.approveFunding({ ...state }),
        outboxState: { displayOutbox: showWallet() },
      };
    default:
      return { channelState: state };
  }
};

const approveFundingReducer = (
  state: states.ApproveFunding,
  action: actions.WalletAction,
  unhandledAction: actions.WalletAction | undefined,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return { channelState: states.approveFunding({ ...state }), unhandledAction: action };
    case actions.FUNDING_APPROVED:
      if (state.ourIndex === 0) {
        const fundingAmount = getFundingAmount(state, state.ourIndex);
        return {
          channelState: states.aWaitForDepositToBeSentToMetaMask({ ...state }),
          outboxState: {
            transactionOutbox: createDepositTransaction(state.channelId, fundingAmount),
          },
        };
      } else {
        const updatedState = states.bWaitForOpponentDeposit(state);
        if (unhandledAction) {
          return fundingReducer({ ...updatedState }, unhandledAction);
        } else {
          return { channelState: updatedState };
        }
      }
    case actions.FUNDING_REJECTED:
      const sendFundingDeclinedAction = messageRelayRequested(
        state.participants[1 - state.ourIndex],
        'FundingDeclined',
      );
      return {
        channelState: states.sendFundingDeclinedMessage({ ...state }),
        outboxState: { messageOutbox: sendFundingDeclinedAction, displayOutbox: hideWallet() },
      };
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return { channelState: states.acknowledgeFundingDeclined(state) };
      } else {
        return { channelState: state };
      }
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return { channelState: states.approveFunding({ ...state, unhandledAction: action }) };
    default:
      return { channelState: state };
  }
};

const aWaitForDepositToBeSentToMetaMaskReducer = (
  state: states.AWaitForDepositToBeSentToMetaMask,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { channelState: states.aSubmitDepositInMetaMask(state) };
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        channelState: states.aWaitForDepositToBeSentToMetaMask({
          ...state,
        }),
        unhandledAction: action,
      };
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return { channelState: states.acknowledgeFundingDeclined(state) };
      }
      break;
    default:
      return { channelState: state };
  }
  return { channelState: state };
};

const aSubmitDepositToMetaMaskReducer = (
  state: states.ASubmitDepositInMetaMask,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        channelState: states.aSubmitDepositInMetaMask({ ...state }),
        unhandledAction: action,
      };
    case actions.TRANSACTION_SUBMITTED:
      return {
        channelState: states.aWaitForDepositConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { channelState: states.aDepositTransactionFailed(state) };
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return { channelState: states.acknowledgeFundingDeclined(state) };
      }
      break;
    default:
      return { channelState: state };
  }
  return { channelState: state };
};

const aWaitForDepositConfirmationReducer = (
  state: states.AWaitForDepositConfirmation,
  action: actions.WalletAction,
  unhandledAction: actions.WalletAction | undefined,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return { channelState: states.acknowledgeFundingDeclined(state) };
      }
      break;
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        channelState: states.aWaitForDepositConfirmation({ ...state }),
        unhandledAction: action,
      };
    case actions.TRANSACTION_CONFIRMED:
      const updatedState = states.aWaitForOpponentDeposit(state);
      if (unhandledAction) {
        // Now that  we're in a correct state to handle the funding received event
        // we recursively call the reducer to handle the funding received event
        return fundingReducer({ ...updatedState }, unhandledAction);
      } else {
        return { channelState: updatedState };
      }
    default:
      return { channelState: state };
  }
  return { channelState: state };
};

const aWaitForOpponentDepositReducer = (
  state: states.AWaitForOpponentDeposit,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return { channelState: states.acknowledgeFundingDeclined(state) };
      }
      break;
    case actions.FUNDING_RECEIVED_EVENT:
      const { allocation } = state.lastCommitment.commitment;
      const totalFunds = bigNumberify(allocation[state.ourIndex]).add(
        allocation[1 - state.ourIndex],
      );

      if (bigNumberify(action.totalForDestination).lt(totalFunds)) {
        return { channelState: state };
      }

      const {
        postFundSetupCommitment,
        commitmentSignature,
        sendCommitmentAction,
      } = composePostFundCommitment(state);
      return {
        channelState: states.aWaitForPostFundSetup({
          ...state,
          turnNum: postFundSetupCommitment.turnNum,
          penultimateCommitment: state.lastCommitment,
          lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
        }),
        outboxState: { messageOutbox: sendCommitmentAction },
      };
    default:
      return { channelState: state };
  }
  return { channelState: state };
};

const aWaitForPostFundSetupReducer = (
  state: states.AWaitForPostFundSetup,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment: postFundState, signature } = action;
      if (!validTransitionToPostFundState(state, postFundState, signature)) {
        return { channelState: state };
      }

      return {
        channelState: states.acknowledgeFundingSuccess({
          ...state,
          turnNum: postFundState.turnNum,
          lastCommitment: { commitment: postFundState, signature },
          penultimateCommitment: state.lastCommitment,
        }),
      };
    default:
      return { channelState: state };
  }
};

const bWaitForOpponentDepositReducer = (
  state: states.BWaitForOpponentDeposit,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      const { allocation } = state.lastCommitment.commitment;
      if (bigNumberify(action.totalForDestination).gte(allocation[1 - state.ourIndex])) {
        return {
          channelState: states.bWaitForDepositToBeSentToMetaMask({ ...state }),
          outboxState: {
            transactionOutbox: createDepositTransaction(
              state.channelId,
              allocation[state.ourIndex],
            ),
          },
        };
      } else {
        return { channelState: state };
      }
    default:
      return { channelState: state };
  }
};

const bWaitForDepositToBeSentToMetaMaskReducer = (
  state: states.BWaitForDepositToBeSentToMetaMask,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { channelState: states.bSubmitDepositInMetaMask(state) };
    default:
      return { channelState: state };
  }
};

const bSubmitDepositInMetaMaskReducer = (
  state: states.BSubmitDepositInMetaMask,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    // This case should not happen in theory, but it does in practice.
    // B submits deposit transaction, transaction is confirmed, A sends postfundset, B receives postfundsetup
    // All of the above happens before B receives transaction submitted
    case actions.MESSAGE_RECEIVED:
      return {
        channelState: states.bSubmitDepositInMetaMask({ ...state }),
        unhandledAction: action,
      };
    case actions.TRANSACTION_SUBMITTED:
      return {
        channelState: states.bWaitForDepositConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { channelState: states.bDepositTransactionFailed(state) };
    default:
      return { channelState: state };
  }
};

const bWaitForDepositConfirmationReducer = (
  state: states.BWaitForDepositConfirmation,
  action: actions.WalletAction,
  unhandledAction: actions.WalletAction | undefined,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      return {
        channelState: states.bWaitForDepositConfirmation({
          ...state,
          transactionHash: state.transactionHash,
        }),
        unhandledAction: action,
      };
    case actions.TRANSACTION_CONFIRMED:
      if (unhandledAction) {
        const updatedState = states.bWaitForPostFundSetup({ ...state, unhandledAction: undefined });
        // Now that  we're in a correct state to handle the message
        // we recursively call the reducer to handle the message received action
        return fundingReducer(updatedState, unhandledAction);
      } else {
        return { channelState: states.bWaitForPostFundSetup(state) };
      }
    default:
      return { channelState: state };
  }
};

const bWaitForPostFundSetupReducer = (
  state: states.BWaitForPostFundSetup,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment, signature } = action;
      if (!validTransitionToPostFundState(state, commitment, signature)) {
        return { channelState: state };
      }

      const newState = { ...state, turnNum: commitment.turnNum };
      const {
        postFundSetupCommitment,
        commitmentSignature,
        sendCommitmentAction,
      } = composePostFundCommitment(newState);
      return {
        channelState: states.acknowledgeFundingSuccess({
          ...newState,
          turnNum: postFundSetupCommitment.turnNum,
          lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
          penultimateCommitment: { commitment, signature },
        }),
        outboxState: { messageOutbox: sendCommitmentAction },
      };
    default:
      return { channelState: state };
  }
};

const acknowledgeFundingSuccessReducer = (
  state: states.AcknowledgeFundingSuccess,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_SUCCESS_ACKNOWLEDGED:
      return {
        channelState: states.waitForUpdate({
          ...state,
        }),
        outboxState: {
          displayOutbox: hideWallet(),
          messageOutbox: fundingSuccess(state.channelId, state.lastCommitment.commitment),
        },
      };
    default:
      return { channelState: state };
  }
};

const validTransitionToPostFundState = (
  state: states.FundingState,
  data: Commitment,
  signature: string | undefined,
) => {
  if (!signature) {
    return false;
  }

  const opponentAddress = state.participants[1 - state.ourIndex];

  if (!validCommitmentSignature(data, signature, opponentAddress)) {
    return false;
  }
  if (!validTransition(state, data)) {
    return false;
  }
  if (data.commitmentType !== 1) {
    return false;
  }
  return true;
};

const composePostFundCommitment = (
  state: states.AWaitForOpponentDeposit | states.BWaitForPostFundSetup,
) => {
  const { libraryAddress, channelNonce, participants, turnNum, lastCommitment } = state;
  const channel: Channel = { channelType: libraryAddress, nonce: channelNonce, participants };

  const postFundSetupCommitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: turnNum + 1,
    commitmentCount: state.ourIndex,
    allocation: lastCommitment.commitment.allocation,
    destination: lastCommitment.commitment.destination,
    appAttributes: state.lastCommitment.commitment.appAttributes,
  };
  const commitmentSignature = signCommitment(postFundSetupCommitment, state.privateKey);

  const sendCommitmentAction = commitmentRelayRequested(
    state.participants[1 - state.ourIndex],
    postFundSetupCommitment,
    commitmentSignature,
  );
  return { postFundSetupCommitment, commitmentSignature, sendCommitmentAction };
};

const getFundingAmount = (state: states.FundingState, index: number): string => {
  const lastCommitment = state.lastCommitment.commitment;
  return lastCommitment.allocation[index];
};
