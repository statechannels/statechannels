import { unreachable } from '../../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../../utils/transaction-generator';

import * as actions from '../../../actions';
import * as states from './state';
import * as fundingStates from '../state';
import { WalletProcedure } from '../../../types';
import { ProtocolReducer, ProtocolStateWithSharedData, SharedData } from '../../../protocols';
import { accumulateSideEffects } from '../../../outbox';

type DFReducer = ProtocolReducer<fundingStates.DirectFundingState>;
export const depositingReducer: DFReducer = (
  state: states.Depositing,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<fundingStates.DirectFundingState> => {
  switch (state.depositStatus) {
    case states.WAIT_FOR_TRANSACTION_SENT:
      return waitForTransactionSentReducer(state, sharedData, action);
    case states.WAIT_FOR_DEPOSIT_APPROVAL:
      return waitForDepositApprovalReducer(state, sharedData, action);
    case states.WAIT_FOR_DEPOSIT_CONFIRMATION:
      return waitForDepositConfirmationReducer(state, sharedData, action);
    case states.DEPOSIT_TRANSACTION_FAILED:
      return depositTransactionFailedReducer(state, sharedData, action);
  }
  return unreachable(state);
};

const waitForTransactionSentReducer: DFReducer = (
  state: states.WaitForTransactionSent,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.Depositing> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return {
        protocolState: states.waitForDepositApproval(state),
        sharedData,
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { protocolState: states.depositTransactionFailed(state), sharedData };
    default:
      return { protocolState: state, sharedData };
  }
};

const waitForDepositApprovalReducer: DFReducer = (
  state: states.WaitForDepositApproval,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.Depositing> => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return {
        protocolState: states.waitForDepositConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
        sharedData,
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { protocolState: states.depositTransactionFailed(state), sharedData };
    default:
      return { protocolState: state, sharedData };
  }
};

const waitForDepositConfirmationReducer: DFReducer = (
  state: states.WaitForDepositConfirmation,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<fundingStates.DirectFundingState> => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return { protocolState: fundingStates.waitForFundingConfirmed(state), sharedData };
    default:
      return { protocolState: state, sharedData };
  }
};

const depositTransactionFailedReducer: DFReducer = (
  state: states.DepositTransactionFailed,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.Depositing> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const sideEffects = {
        transactionOutbox: {
          transactionRequest: createDepositTransaction(
            state.channelId,
            state.requestedYourContribution,
          ),
          channelId: action.channelId,
          procedure: WalletProcedure.DirectFunding,
        },
      };
      return {
        protocolState: states.waitForTransactionSent({
          ...state,
        }),
        sharedData: {
          ...sharedData,
          outboxState: accumulateSideEffects(sharedData.outboxState, sideEffects),
        },
      };
  }
  return { protocolState: state, sharedData };
};
