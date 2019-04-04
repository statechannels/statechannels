import * as internal from './internal/actions';
import * as channel from './channel-state/actions';
import * as funding from './direct-funding-store/direct-funding-state/actions';
import * as indirectFunding from './indirect-funding/actions';
import { WalletProcedure } from './types';
import { Commitment } from 'fmg-core';

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

export type Message = 'FundingDeclined';
export const MESSAGE_RECEIVED = 'WALLET.COMMON.MESSAGE_RECEIVED';
export const messageReceived = (channelId: string, procedure: WalletProcedure, data: Message) => ({
  type: MESSAGE_RECEIVED as typeof MESSAGE_RECEIVED,
  channelId,
  procedure,
  data,
});
export type MessageReceived = ReturnType<typeof messageReceived>;

export const COMMITMENT_RECEIVED = 'WALLET.COMMON.COMMITMENT_RECEIVED';
export const commitmentReceived = (
  channelId: string,
  procedure: WalletProcedure,
  commitment: Commitment,
  signature: string,
) => ({
  type: COMMITMENT_RECEIVED as typeof COMMITMENT_RECEIVED,
  channelId,
  procedure,
  commitment,
  signature,
});
export type CommitmentReceived = ReturnType<typeof commitmentReceived>;

export type CommonAction =
  | TransactionConfirmed
  | TransactionSentToMetamask
  | TransactionSubmissionFailed
  | TransactionSubmitted
  | RetryTransaction
  | MessageReceived
  | CommitmentReceived;

export type ProcedureAction = CommonAction;

export function isCommonAction(action: WalletAction): action is CommonAction {
  return action.type.match('WALLET.COMMON') ? true : false;
}

export function isProcedureAction(action: WalletAction): action is ProcedureAction {
  return 'procedure' in action;
}

export { internal, channel, funding, indirectFunding };

export type WalletAction =
  | AdjudicatorKnown
  | BlockMined
  | DisplayMessageSent
  | LoggedIn
  | MessageSent
  | MetamaskLoadError
  | CommonAction
  | channel.ChannelAction
  | internal.InternalAction
  | funding.FundingAction
  | indirectFunding.Action;
