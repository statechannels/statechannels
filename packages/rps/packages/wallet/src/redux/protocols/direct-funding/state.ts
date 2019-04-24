import { bigNumberify } from 'ethers/utils';
import { ProtocolStateWithSharedData } from '..';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import { DirectFundingRequested } from '../../internal/actions';
import { SharedData } from '../../state';
import { initialize as initTransactionState } from '../transaction-submission/reducer';
import { NonTerminalTransactionSubmissionState } from '../transaction-submission/states';
import { Properties, Constructor } from '../../utils';

// ChannelFundingStatus
export const NOT_SAFE_TO_DEPOSIT = 'NOT_SAFE_TO_DEPOSIT';
export const WAIT_FOR_DEPOSIT_TRANSACTION = 'WAIT_FOR_DEPOSIT_TRANSACTION';
export const WAIT_FOR_FUNDING_AND_POST_FUND_SETUP = 'WAIT_FOR_FUNDING_AND_POST_FUND_SETUP';
export const FUNDING_SUCCESS = 'CHANNEL_FUNDED';
// Funding status
export type ChannelFundingStatus =
  | typeof NOT_SAFE_TO_DEPOSIT
  | typeof WAIT_FOR_DEPOSIT_TRANSACTION
  | typeof WAIT_FOR_FUNDING_AND_POST_FUND_SETUP
  | typeof FUNDING_SUCCESS;
export const DIRECT_FUNDING = 'FUNDING_TYPE.DIRECT';
export interface BaseDirectFundingState {
  processId: string;
  safeToDepositLevel: string;
  type: ChannelFundingStatus;
  requestedTotalFunds: string;
  requestedYourContribution: string;
  channelId: string;
  ourIndex: number;
}
export interface NotSafeToDeposit extends BaseDirectFundingState {
  type: typeof NOT_SAFE_TO_DEPOSIT;
}
export interface WaitForDepositTransaction extends BaseDirectFundingState {
  type: typeof WAIT_FOR_DEPOSIT_TRANSACTION;
  transactionSubmissionState: NonTerminalTransactionSubmissionState;
}
export interface WaitForFundingAndPostFundSetup extends BaseDirectFundingState {
  type: typeof WAIT_FOR_FUNDING_AND_POST_FUND_SETUP;
  channelFunded: boolean;
  postFundSetupReceived: boolean;
}
export interface FundingSuccess extends BaseDirectFundingState {
  type: typeof FUNDING_SUCCESS;
}
// constructors
export const baseDirectFundingState: Constructor<BaseDirectFundingState> = params => {
  const {
    processId,
    requestedTotalFunds,
    requestedYourContribution,
    channelId,
    ourIndex,
    safeToDepositLevel,
    type: channelFundingStatus,
  } = params;
  return {
    processId,
    requestedTotalFunds,
    requestedYourContribution,
    channelId,
    ourIndex,
    safeToDepositLevel,
    type: channelFundingStatus,
  };
};
export const notSafeToDeposit: Constructor<NotSafeToDeposit> = params => {
  return {
    ...baseDirectFundingState(params),
    type: NOT_SAFE_TO_DEPOSIT,
  };
};
export function waitForDepositTransaction(
  params: Properties<WaitForDepositTransaction>,
): WaitForDepositTransaction {
  const { transactionSubmissionState } = params;
  return {
    ...baseDirectFundingState(params),
    type: WAIT_FOR_DEPOSIT_TRANSACTION,
    transactionSubmissionState,
  };
}
export const waitForFundingAndPostFundSetup: Constructor<
  WaitForFundingAndPostFundSetup
> = params => {
  return {
    ...baseDirectFundingState(params),
    channelFunded: params.channelFunded,
    postFundSetupReceived: params.postFundSetupReceived,
    type: WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
  };
};
export const fundingSuccess: Constructor<FundingSuccess> = params => {
  return {
    ...baseDirectFundingState(params),
    type: FUNDING_SUCCESS,
  };
};
export type DirectFundingState =
  | NotSafeToDeposit
  | WaitForDepositTransaction
  | WaitForFundingAndPostFundSetup
  | FundingSuccess;

export function initialDirectFundingState(
  action: DirectFundingRequested,
  sharedData: SharedData,
): ProtocolStateWithSharedData<DirectFundingState> {
  const { safeToDepositLevel, totalFundingRequired, requiredDeposit, channelId, ourIndex } = action;

  const alreadySafeToDeposit = bigNumberify(safeToDepositLevel).eq('0x');
  const alreadyFunded = bigNumberify(totalFundingRequired).eq('0x');

  if (alreadyFunded) {
    return {
      protocolState: fundingSuccess({
        processId: action.processId,
        requestedTotalFunds: totalFundingRequired,
        requestedYourContribution: requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
      }),
      sharedData,
    };
  }

  if (alreadySafeToDeposit) {
    const depositTransaction = createDepositTransaction(action.channelId, action.requiredDeposit);
    const { storage: newSharedData, state: transactionSubmissionState } = initTransactionState(
      depositTransaction,
      action.processId,
      sharedData,
    );

    return {
      protocolState: waitForDepositTransaction({
        processId: action.processId,
        requestedTotalFunds: totalFundingRequired,
        requestedYourContribution: requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        transactionSubmissionState,
      }),
      sharedData: newSharedData,
    };
  }

  return {
    protocolState: notSafeToDeposit({
      processId: action.processId,
      requestedTotalFunds: totalFundingRequired,
      requestedYourContribution: requiredDeposit,
      channelId,
      ourIndex,
      safeToDepositLevel,
    }),
    sharedData,
  };
}
