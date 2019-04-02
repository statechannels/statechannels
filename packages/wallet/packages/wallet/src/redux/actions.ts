import * as internal from './internal/actions';
import * as channel from './channelState/actions';
import * as funding from './fundingState/actions';
import { WalletProcedure } from './types';

export const LOGGED_IN = 'WALLET.LOGGED_IN';
export const loggedIn = (uid: string) => ({
  type: LOGGED_IN as typeof LOGGED_IN,
  uid,
});
export type LoggedIn = ReturnType<typeof loggedIn>;

export const ADJUDICATOR_KNOWN = 'WALLET.ADJUDICATOR_KNOWN';
export const adjudicatorKnown = (networkId: string, adjudicator: string) => ({
  type: ADJUDICATOR_KNOWN as typeof ADJUDICATOR_KNOWN,
  networkId,
  adjudicator,
});
export type AdjudicatorKnown = ReturnType<typeof adjudicatorKnown>;

export const MESSAGE_SENT = 'WALLET.MESSAGE_SENT';
export const messageSent = () => ({
  type: MESSAGE_SENT as typeof MESSAGE_SENT,
});
export type MessageSent = ReturnType<typeof messageSent>;

export const DISPLAY_MESSAGE_SENT = 'WALLET.DISPLAY_MESSAGE_SENT';
export const displayMessageSent = () => ({
  type: DISPLAY_MESSAGE_SENT as typeof DISPLAY_MESSAGE_SENT,
});
export type DisplayMessageSent = ReturnType<typeof displayMessageSent>;

export const DEPOSIT_INITIATED = 'WALLET.DEPOSIT_INITIATED'; // when sent to metamask
export const depositInitiated = () => ({
  type: DEPOSIT_INITIATED as typeof DEPOSIT_INITIATED,
});
export type DepositInitiated = ReturnType<typeof depositInitiated>;

export const DEPOSIT_SUBMITTED = '.'; // when submitted to network

export const DEPOSIT_CONFIRMED = 'WALLET.DEPOSIT_CONFIRMED'; // when first seen in a block
export const depositConfirmed = () => ({
  type: DEPOSIT_CONFIRMED as typeof DEPOSIT_CONFIRMED,
});
export type DepositConfirmed = ReturnType<typeof depositConfirmed>;

export const DEPOSIT_FINALISED = 'WALLET.DEPOSIT_FINALISED'; // when X blocks deep
export const depositFinalised = () => ({
  type: DEPOSIT_FINALISED as typeof DEPOSIT_FINALISED,
});
export type DepositFinalised = ReturnType<typeof depositFinalised>;

export const BLOCK_MINED = 'BLOCK_MINED';
export const blockMined = (block: { timestamp: number; number: number }) => ({
  type: BLOCK_MINED as typeof BLOCK_MINED,
  block,
});
export type BlockMined = ReturnType<typeof blockMined>;

export const METAMASK_LOAD_ERROR = 'METAMASK_LOAD_ERROR';
export const metamaskLoadError = () => ({
  type: METAMASK_LOAD_ERROR as typeof METAMASK_LOAD_ERROR,
});
export type MetamaskLoadError = ReturnType<typeof metamaskLoadError>;

// Common Transaction Actions
// These actions are relevant to multiple branches of the wallet state tree
export const TRANSACTION_SENT_TO_METAMASK = 'WALLET.COMMON.TRANSACTION_SENT_TO_METAMASK';
export const transactionSentToMetamask = (channelId: string, procedure: WalletProcedure) => ({
  type: TRANSACTION_SENT_TO_METAMASK as typeof TRANSACTION_SENT_TO_METAMASK,
  channelId,
  procedure,
});
export type TransactionSentToMetamask = ReturnType<typeof transactionSentToMetamask>;

export const TRANSACTION_SUBMISSION_FAILED = 'WALLET.COMMON.TRANSACTION_SUBMISSION_FAILED';
export const transactionSubmissionFailed = (
  channelId: string,
  procedure: WalletProcedure,
  error: { message?: string; code },
) => ({
  error,
  channelId,
  procedure,
  type: TRANSACTION_SUBMISSION_FAILED as typeof TRANSACTION_SUBMISSION_FAILED,
});
export type TransactionSubmissionFailed = ReturnType<typeof transactionSubmissionFailed>;

export const TRANSACTION_SUBMITTED = 'WALLET.COMMON.TRANSACTION_SUBMITTED';
export const transactionSubmitted = (
  channelId: string,
  procedure: WalletProcedure,
  transactionHash: string,
) => ({
  channelId,
  procedure,
  transactionHash,
  type: TRANSACTION_SUBMITTED as typeof TRANSACTION_SUBMITTED,
});
export type TransactionSubmitted = ReturnType<typeof transactionSubmitted>;

export const TRANSACTION_CONFIRMED = 'WALLET.COMMON.TRANSACTION_CONFIRMED';
export const transactionConfirmed = (
  channelId: string,
  procedure: WalletProcedure,
  contractAddress?: string,
) => ({
  channelId,
  procedure,
  contractAddress,
  type: TRANSACTION_CONFIRMED as typeof TRANSACTION_CONFIRMED,
});
export type TransactionConfirmed = ReturnType<typeof transactionConfirmed>;

export const TRANSACTION_FINALIZED = 'WALLET.COMMON.TRANSACTION_FINALIZED';
export const transactionFinalized = (channelId: string, procedure: WalletProcedure) => ({
  channelId,
  procedure,
  type: TRANSACTION_FINALIZED as typeof TRANSACTION_FINALIZED,
});
export type TransactionFinalized = ReturnType<typeof transactionFinalized>;

export const RETRY_TRANSACTION = 'WALLET.COMMON.RETRY_TRANSACTION';
export const retryTransaction = (channelId: string, procedure: WalletProcedure) => ({
  type: RETRY_TRANSACTION as typeof RETRY_TRANSACTION,
  channelId,
  procedure,
});
export type RetryTransaction = ReturnType<typeof retryTransaction>;

export type CommonAction =
  | TransactionConfirmed
  | TransactionSentToMetamask
  | TransactionSubmissionFailed
  | TransactionSubmitted
  | RetryTransaction;

export function isCommonAction(action: WalletAction): action is CommonAction {
  return action.type.match('WALLET.COMMON') ? true : false;
}

export { internal, channel, funding };

// TODO: This is getting large, we should probably split this up into separate types for each stage
export type WalletAction =
  | AdjudicatorKnown
  | BlockMined
  | DepositConfirmed
  | DepositInitiated
  | DisplayMessageSent
  | LoggedIn
  | MessageSent
  | MetamaskLoadError
  | CommonAction
  | channel.ChannelAction
  | internal.InternalAction
  | funding.FundingAction;
