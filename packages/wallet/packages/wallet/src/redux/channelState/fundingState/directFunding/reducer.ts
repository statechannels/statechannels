import * as states from '../state';
import * as actions from '../../../actions';

import { unreachable } from '../../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../../utils/transaction-generator';

import { bigNumberify } from 'ethers/utils';
import { DIRECT_FUNDING } from '../state';

export const directFundingStateReducer = (
  state: states.WaitForFundingRequest | states.DirectFundingState,
  action: actions.WalletAction,
  channelId: string,
  ourIndex: number,
): states.DirectFundingStateWithSideEffects => {
  switch (state.type) {
    //
    case states.WAIT_FOR_FUNDING_REQUEST:
      return waitForFundingRequestReducer(state, action);
    case states.WAIT_FOR_FUNDING_APPROVAL:
      return waitForFundingApprovalReducer(state, action, ourIndex, channelId);
    case states.A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
      return aWaitForDepositToBeSentToMetaMaskReducer(state, action);
    case states.A_SUBMIT_DEPOSIT_IN_METAMASK:
      return aSubmitDepositToMetaMaskReducer(state, action);
    case states.A_WAIT_FOR_DEPOSIT_CONFIRMATION:
      return aWaitForDepositConfirmationReducer(state, action);
    case states.A_WAIT_FOR_OPPONENT_DEPOSIT:
      return aWaitForOpponentDepositReducer(state, action, channelId);
    //
    case states.B_WAIT_FOR_OPPONENT_DEPOSIT:
      return bWaitForOpponentDepositReducer(state, action, channelId);
    case states.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK:
      return bWaitForDepositToBeSentToMetaMaskReducer(state, action);
    case states.B_SUBMIT_DEPOSIT_IN_METAMASK:
      return bSubmitDepositInMetaMaskReducer(state, action);
    case states.B_WAIT_FOR_DEPOSIT_CONFIRMATION:
      return bWaitForDepositConfirmationReducer(state, action);
    //
    case states.A_DEPOSIT_TRANSACTION_FAILED:
      return aDepositTransactionFailedReducer(state, action, channelId);
    case states.B_DEPOSIT_TRANSACTION_FAILED:
      return bDepositTransactionFailedReducer(state, action, channelId);
    case states.FUNDING_CONFIRMED:
      return { fundingState: state };
    default:
      return unreachable(state);
  }
};

const waitForFundingRequestReducer = (
  state: states.WaitForFundingRequest,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_REQUESTED:
      return {
        fundingState: states.waitForFundingApproval({
          ...state,
          fundingType: DIRECT_FUNDING,
        }),
      };
    default:
      return { fundingState: state };
  }
};

const waitForFundingApprovalReducer = (
  state: states.WaitForFundingApproval,
  action: actions.WalletAction,
  ourIndex: number,
  channelId: string,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_APPROVED:
      if (ourIndex === 0) {
        return {
          fundingState: states.aWaitForDepositToBeSentToMetaMask({
            ...state,
            fundingType: DIRECT_FUNDING,
          }),
          outboxState: {
            transactionOutbox: createDepositTransaction(channelId, state.requestedYourContribution),
          },
        };
      } else {
        return {
          fundingState: states.bWaitForOpponentDeposit({
            ...state,
            fundingType: DIRECT_FUNDING,
          }),
        };
      }
    default:
      return { fundingState: state };
  }
};

const aWaitForDepositToBeSentToMetaMaskReducer = (
  state: states.AWaitForDepositToBeSentToMetaMask,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { fundingState: states.aSubmitDepositInMetaMask(state) };
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        fundingState: states.aWaitForDepositToBeSentToMetaMask({
          ...state,
        }),
      };
    default:
      return { fundingState: state };
  }
};

const aSubmitDepositToMetaMaskReducer = (
  state: states.ASubmitDepositInMetaMask,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        fundingState: states.aSubmitDepositInMetaMask({ ...state }),
      };
    case actions.TRANSACTION_SUBMITTED:
      return {
        fundingState: states.aWaitForDepositConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { fundingState: states.aDepositTransactionFailed(state) };
    default:
      return { fundingState: state };
  }
};

const aWaitForDepositConfirmationReducer = (
  state: states.AWaitForDepositConfirmation,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        fundingState: states.aWaitForDepositConfirmation({ ...state }),
      };
    case actions.TRANSACTION_CONFIRMED:
      return { fundingState: states.aWaitForOpponentDeposit(state) };
    default:
      return { fundingState: state };
  }
};

const aWaitForOpponentDepositReducer = (
  state: states.AWaitForOpponentDeposit,
  action: actions.WalletAction,
  channelId: string,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      if (sufficientlyFundedToProgress('A', state, action, channelId)) {
        return { fundingState: states.fundingConfirmed(state) };
      } else {
        return { fundingState: state };
      }
    default:
      return { fundingState: state };
  }
};

const bWaitForOpponentDepositReducer = (
  state: states.BWaitForOpponentDeposit,
  action: actions.WalletAction,
  channelId: string,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      if (channelId !== action.destination) {
        return { fundingState: state };
      }
      if (
        bigNumberify(action.totalForDestination).lt(
          bigNumberify(state.requestedTotalFunds).sub(state.requestedYourContribution),
        )
      ) {
        return { fundingState: state };
      }

      return {
        fundingState: states.bWaitForDepositToBeSentToMetaMask({ ...state }),
        outboxState: {
          transactionOutbox: createDepositTransaction(channelId, state.requestedYourContribution),
        },
      };
    default:
      return { fundingState: state };
  }
};

const bWaitForDepositToBeSentToMetaMaskReducer = (
  state: states.BWaitForDepositToBeSentToMetaMask,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { fundingState: states.bSubmitDepositInMetaMask(state) };
    default:
      return { fundingState: state };
  }
};

const bSubmitDepositInMetaMaskReducer = (
  state: states.BSubmitDepositInMetaMask,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    // This case should not happen in theory, but it does in practice.
    // B submits deposit transaction, transaction is confirmed, A sends postfundset, B receives postfundsetup
    // All of the above happens before B receives transaction submitted
    case actions.TRANSACTION_SUBMITTED:
      return {
        fundingState: states.bWaitForDepositConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { fundingState: states.bDepositTransactionFailed(state) };
    default:
      return { fundingState: state };
  }
};

const aDepositTransactionFailedReducer = (
  state: states.ADepositTransactionFailed,
  action: actions.WalletAction,
  channelId: string,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      return {
        fundingState: states.aWaitForDepositToBeSentToMetaMask({
          ...state,
        }),
        outboxState: {
          transactionOutbox: createDepositTransaction(channelId, state.requestedYourContribution),
        },
      };
  }
  return { fundingState: state };
};

const bDepositTransactionFailedReducer = (
  state: states.BDepositTransactionFailed,
  action: actions.WalletAction,
  channelId: string,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      return {
        fundingState: states.bWaitForDepositToBeSentToMetaMask({ ...state }),
        outboxState: {
          transactionOutbox: createDepositTransaction(channelId, state.requestedYourContribution),
        },
      };
  }
  return { fundingState: state };
};

const bWaitForDepositConfirmationReducer = (
  state: states.BWaitForDepositConfirmation,
  action: actions.WalletAction,
): states.DirectFundingStateWithSideEffects => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
    case actions.TRANSACTION_CONFIRMED:
      return { fundingState: states.fundingConfirmed(state) };
    default:
      return { fundingState: state };
  }
};

function sufficientlyFundedToProgress(player: 'A' | 'B', state, action, channelId) {
  if (channelId !== action.destination) {
    return false;
  }
  if (player === 'A' && bigNumberify(action.totalForDestination).gte(state.requestedTotalFunds)) {
    return true;
  }

  if (
    player === 'B' &&
    bigNumberify(action.totalForDestination).gte(
      bigNumberify(state.requestedTotalFunds).sub(bigNumberify(state.requestedYourContribution)),
    )
  ) {
    return true;
  }

  return false;
}
