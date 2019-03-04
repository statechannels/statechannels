import * as states from '../../states';
import * as actions from '../actions';
import { messageRequest, fundingSuccess, fundingFailure, showWallet, hideWallet } from 'magmo-wallet-client/lib/wallet-events';

import { unreachable, validTransition } from '../../utils/reducer-utils';
import { createDepositTransaction } from '../../utils/transaction-generator';
import { signCommitment, validCommitmentSignature } from '../../utils/signing-utils';

import { Channel, Commitment, CommitmentType, } from 'fmg-core';
import { handleSignatureAndValidationMessages } from '../../utils/state-utils';
import { fromHex, toHex } from 'fmg-core';
import { bigNumberify } from 'ethers/utils';



export const fundingReducer = (state: states.FundingState, action: actions.WalletAction): states.WalletState => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (action.type === actions.OWN_COMMITMENT_RECEIVED || action.type === actions.OPPONENT_COMMITMENT_RECEIVED) {
    return { ...state, messageOutbox: handleSignatureAndValidationMessages(state, action) };
  }
  switch (state.type) {
    case states.WAIT_FOR_FUNDING_REQUEST:
      return waitForFundingRequestReducer(state, action);
    case states.APPROVE_FUNDING:
      return approveFundingReducer(state, action);
      //
    case states.A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
      return aWaitForDepositToBeSentToMetaMaskReducer(state, action);
    case states.A_SUBMIT_DEPOSIT_IN_METAMASK:
      return aSubmitDepositToMetaMaskReducer(state, action);
    case states.A_WAIT_FOR_DEPOSIT_CONFIRMATION:
      return aWaitForDepositConfirmationReducer(state, action);
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
      return bWaitForDepositConfirmationReducer(state, action);
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

const aDepositTransactionFailedReducer = (state: states.ADepositTransactionFailed, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const fundingAmount = getFundingAmount(state, state.ourIndex);
      return states.aWaitForDepositToBeSentToMetaMask({
        ...state,
        transactionOutbox: createDepositTransaction(state.adjudicator, state.channelId, fundingAmount),
      });
  }
  return state;
};

const bDepositTransactionFailedReducer = (state: states.BDepositTransactionFailed, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const fundingAmount = getFundingAmount(state, state.ourIndex);
      return states.bWaitForDepositToBeSentToMetaMask({
        ...state,
        adjudicator: state.adjudicator,
        transactionOutbox: createDepositTransaction(state.adjudicator, state.channelId, fundingAmount),
      });
  }
  return state;
};

const acknowledgeFundingDeclinedReducer = (state: states.AcknowledgeFundingDeclined, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return states.waitForChannel({
        ...state,
        messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
        displayOutbox: hideWallet(),
      });
  }
  return state;
};

const sendFundingDeclinedMessageReducer = (state: states.SendFundingDeclinedMessage, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_SENT:
      return states.waitForChannel({
        ...state,
        messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
        displayOutbox: hideWallet(),
      });
      break;
  }
  return state;
};

const waitForFundingRequestReducer = (state: states.WaitForFundingRequest, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.FUNDING_REQUESTED:
      return states.approveFunding({ ...state, displayOutbox: showWallet() });
    default:
      return state;
  }
};

const approveFundingReducer = (state: states.ApproveFunding, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return states.approveFunding({ ...state, unhandledAction: action });
    case actions.FUNDING_APPROVED:
      if (state.ourIndex === 0) {
        const fundingAmount = getFundingAmount(state, state.ourIndex);
        return states.aWaitForDepositToBeSentToMetaMask({
          ...state,
          transactionOutbox: createDepositTransaction(state.adjudicator, state.channelId, fundingAmount),
        });
      } else {
        const updatedState = states.bWaitForOpponentDeposit(state);
        if (state.unhandledAction) {
          return fundingReducer({ ...updatedState, unhandledAction: undefined }, state.unhandledAction);
        } else {
          return updatedState;
        }

      }
    case actions.FUNDING_REJECTED:
      const sendFundingDeclinedAction = messageRequest(state.participants[1 - state.ourIndex], 'FundingDeclined', "");
      return states.sendFundingDeclinedMessage({
        ...state,
        messageOutbox: sendFundingDeclinedAction,
        displayOutbox: hideWallet(),
      });
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return states.acknowledgeFundingDeclined(state);
      } else {
        return state;
      }
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return states.approveFunding({ ...state, unhandledAction: action });
    default:
      return state;
  }
};

const aWaitForDepositToBeSentToMetaMaskReducer = (state: states.AWaitForDepositToBeSentToMetaMask, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return states.aSubmitDepositInMetaMask(state);
    case actions.FUNDING_RECEIVED_EVENT:
      return states.aWaitForDepositToBeSentToMetaMask({ ...state, unhandledAdjudicatorEvent: action });
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return states.acknowledgeFundingDeclined(state);
      }
      break;
    default:
      return state;
  }
  return state;
};

const aSubmitDepositToMetaMaskReducer = (state: states.ASubmitDepositInMetaMask, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return states.aSubmitDepositInMetaMask({ ...state, unhandledAction: action });
    case actions.TRANSACTION_SUBMITTED:
      return states.aWaitForDepositConfirmation({ ...state, transactionHash: action.transactionHash });
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return states.aDepositTransactionFailed(state);
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return states.acknowledgeFundingDeclined(state);
      }
      break;
    default:
      return state;
  }
  return state;
};

const aWaitForDepositConfirmationReducer = (state: states.AWaitForDepositConfirmation, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return states.acknowledgeFundingDeclined(state);
      }
      break;
    case actions.FUNDING_RECEIVED_EVENT:
      return states.aWaitForDepositConfirmation({ ...state, unhandledAction: action });
    case actions.TRANSACTION_CONFIRMED:
      const updatedState = states.aWaitForOpponentDeposit(state);
      if (state.unhandledAction) {
        // Now that  we're in a correct state to handle the funding received event 
        // we recursively call the reducer to handle the funding received event
        return fundingReducer({ ...updatedState, unhandledAction: undefined }, state.unhandledAction);
      }
      else {
        return updatedState;
      }
    default:
      return state;
  }
  return state;
};

const aWaitForOpponentDepositReducer = (state: states.AWaitForOpponentDeposit, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return states.acknowledgeFundingDeclined(state);
      }
      break;
    case actions.FUNDING_RECEIVED_EVENT:
      const { allocation } = state.lastCommitment.commitment;
      const totalFunds = bigNumberify(allocation[state.ourIndex]).add(allocation[1 - state.ourIndex]);

      if (bigNumberify(action.totalForDestination).lt(totalFunds)) {
        return state;
      }

      const { postFundSetupCommitment, commitmentSignature, sendMessageAction } = composePostFundCommitment(state);
      return states.aWaitForPostFundSetup({
        ...state,
        turnNum: postFundSetupCommitment.turnNum,
        penultimateCommitment: state.lastCommitment,
        lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
        messageOutbox: sendMessageAction,
      });
    default:
      return state;
  }
  return state;
};

const aWaitForPostFundSetupReducer = (state: states.AWaitForPostFundSetup, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      const messageState = fromHex(action.data);
      if (!validTransitionToPostFundState(state, messageState, action.signature)) { return state; }

      const postFundState = fromHex(action.data);
      return states.acknowledgeFundingSuccess({
        ...state,
        turnNum: postFundState.turnNum,
        lastCommitment: { commitment: messageState, signature: action.signature! },
        penultimateCommitment: state.lastCommitment,
      });
    default:
      return state;
  }
};



const bWaitForOpponentDepositReducer =  (state: states.BWaitForOpponentDeposit, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      const { allocation } = state.lastCommitment.commitment;
      if (bigNumberify(action.totalForDestination).gte(allocation[1 - state.ourIndex])) {
        return states.bWaitForDepositToBeSentToMetaMask({
          ...state,
          transactionOutbox: createDepositTransaction(state.adjudicator, state.channelId, allocation[state.ourIndex]),
        });
      } else {
        return state;
      }
    default:
      return state;
  }
};

const bWaitForDepositToBeSentToMetaMaskReducer = (state: states.BWaitForDepositToBeSentToMetaMask, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return states.bSubmitDepositInMetaMask(state);
    default:
      return state;
  }
};

const bSubmitDepositInMetaMaskReducer = (state: states.BSubmitDepositInMetaMask, action: actions.WalletAction) => {
  switch (action.type) {
    // This case should not happen in theory, but it does in practice.
    // B submits deposit transaction, transaction is confirmed, A sends postfundset, B receives postfundsetup
    // All of the above happens before B receives transaction submitted
    case actions.MESSAGE_RECEIVED:
      return states.bSubmitDepositInMetaMask({
        ...state,
        unhandledAction: action,
      });
    case actions.TRANSACTION_SUBMITTED:
      return states.bWaitForDepositConfirmation({ ...state, transactionHash: action.transactionHash });
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return states.bDepositTransactionFailed(state);
    default:
      return state;
  }
};

const bWaitForDepositConfirmationReducer = (state: states.BWaitForDepositConfirmation, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      if (!action.signature) { return state; }
      return states.bWaitForDepositConfirmation({
        ...state,
        unhandledAction: action,
        transactionHash: state.transactionHash,
      });
    case actions.TRANSACTION_CONFIRMED:
      if (state.unhandledAction) {
        const updatedState = states.bWaitForPostFundSetup({ ...state, unhandledAction: undefined });
        // Now that  we're in a correct state to handle the message
        // we recursively call the reducer to handle the message received action
        return fundingReducer(updatedState, state.unhandledAction);
      } else {
        return states.bWaitForPostFundSetup(state);
      }
    default:
      return state;
  }
};

const bWaitForPostFundSetupReducer = (state: states.BWaitForPostFundSetup, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      const messageCommitment = fromHex(action.data);
      if (!validTransitionToPostFundState(state, messageCommitment, action.signature)) {
        return state;
      }

      const newState = { ...state, turnNum: messageCommitment.turnNum };
      const { postFundSetupCommitment, commitmentSignature, sendMessageAction } = composePostFundCommitment(newState);
      return states.acknowledgeFundingSuccess({
        ...newState,
        turnNum: postFundSetupCommitment.turnNum,
        lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
        penultimateCommitment: { commitment: messageCommitment, signature: action.signature! },
        messageOutbox: sendMessageAction,
      });
    default:
      return state;
  }
};

const acknowledgeFundingSuccessReducer = (state: states.AcknowledgeFundingSuccess, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.FUNDING_SUCCESS_ACKNOWLEDGED:
      return states.waitForUpdate({
        ...state,
        displayOutbox: hideWallet(),
        messageOutbox: fundingSuccess(state.channelId, state.lastCommitment.commitment),
      });
    default:
      return state;
  }
};

const validTransitionToPostFundState = (state: states.FundingState, data: Commitment, signature: string | undefined) => {
  if (!signature) { return false; }

  const opponentAddress = state.participants[1 - state.ourIndex];

  if (!validCommitmentSignature(data, signature, opponentAddress)) { return false; }
  // check transition
  if (!validTransition(state, data)) { return false; }
  if (data.commitmentType !== 1) { return false; }
  return true;
};

const composePostFundCommitment = (state: states.AWaitForOpponentDeposit | states.BWaitForPostFundSetup) => {
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

  const sendMessageAction = messageRequest(state.participants[1 - state.ourIndex], toHex(postFundSetupCommitment), commitmentSignature);
  return { postFundSetupCommitment, commitmentSignature, sendMessageAction };
};

const getFundingAmount = (state: states.FundingState, index: number): string => {
  const lastCommitment = state.lastCommitment.commitment;
  return lastCommitment.allocation[index];
};
