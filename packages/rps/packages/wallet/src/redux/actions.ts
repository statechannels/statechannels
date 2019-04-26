import * as internal from './internal/actions';
import * as channel from './channel-store/actions';
import { FundingAction } from './protocols/funding/actions';
import * as directFunding from './protocols/direct-funding/actions';
import * as indirectFunding from './protocols/indirect-funding/actions';
import * as protocol from './protocols/actions';
import * as challenging from './protocols/challenging/actions';
import { Commitment } from '../domain';
import {
  TransactionAction as TA,
  isTransactionAction as isTA,
} from './protocols/transaction-submission/actions';
import { WithdrawalAction } from './protocols/withdrawing/actions';
import { RespondingAction } from './protocols/responding/actions';
export * from './protocols/transaction-submission/actions';

export type TransactionAction = TA;
export const isTransactionAction = isTA;

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

export type Message = 'FundingDeclined';
export const MESSAGE_RECEIVED = 'WALLET.COMMON.MESSAGE_RECEIVED';
export const messageReceived = (processId: string, data: Message) => ({
  type: MESSAGE_RECEIVED as typeof MESSAGE_RECEIVED,
  processId,
  data,
});
export type MessageReceived = ReturnType<typeof messageReceived>;

export const COMMITMENT_RECEIVED = 'WALLET.COMMON.COMMITMENT_RECEIVED';
export const commitmentReceived = (
  processId: string,
  commitment: Commitment,
  signature: string,
) => ({
  type: COMMITMENT_RECEIVED as typeof COMMITMENT_RECEIVED,
  processId,
  commitment,
  signature,
});
export type CommitmentReceived = ReturnType<typeof commitmentReceived>;

export const CHALLENGE_CREATED_EVENT = 'WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT';
export const challengeCreatedEvent = (channelId: string, commitment: Commitment, finalizedAt) => ({
  channelId,
  commitment,
  finalizedAt,
  type: CHALLENGE_CREATED_EVENT as typeof CHALLENGE_CREATED_EVENT,
});
export type ChallengeCreatedEvent = ReturnType<typeof challengeCreatedEvent>;

export const CONCLUDED_EVENT = 'WALLET.ADJUDICATOR.CONCLUDED_EVENT';
export const concludedEvent = (processId: string, channelId: string) => ({
  processId,
  channelId,
  type: CONCLUDED_EVENT as typeof CONCLUDED_EVENT,
});
export type ConcludedEvent = ReturnType<typeof concludedEvent>;

export const REFUTED_EVENT = 'WALLET.ADJUDICATOR.REFUTED_EVENT';
export const refutedEvent = (
  processId: string,
  channelId: string,
  refuteCommitment: Commitment,
) => ({
  processId,
  channelId,
  refuteCommitment,
  type: REFUTED_EVENT as typeof REFUTED_EVENT,
});
export type RefutedEvent = ReturnType<typeof refutedEvent>;

export const RESPOND_WITH_MOVE_EVENT = 'WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT';
export const respondWithMoveEvent = (processId: string, channelId: string, responseCommitment) => ({
  processId,
  channelId,
  responseCommitment,
  type: RESPOND_WITH_MOVE_EVENT as typeof RESPOND_WITH_MOVE_EVENT,
});
export type RespondWithMoveEvent = ReturnType<typeof respondWithMoveEvent>;

export const FUNDING_RECEIVED_EVENT = 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT';
export const fundingReceivedEvent = (
  processId: string,
  channelId: string,
  amount: string,
  totalForDestination: string,
) => ({
  processId,
  channelId,
  amount,
  totalForDestination,
  type: FUNDING_RECEIVED_EVENT as typeof FUNDING_RECEIVED_EVENT,
});
export type FundingReceivedEvent = ReturnType<typeof fundingReceivedEvent>;

export const CHALLENGE_EXPIRED_EVENT = 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED';
export const challengeExpiredEvent = (processId: string, channelId: string, timestamp: number) => ({
  processId,
  channelId,
  timestamp,
  type: CHALLENGE_EXPIRED_EVENT as typeof CHALLENGE_EXPIRED_EVENT,
});
export type ChallengeExpiredEvent = ReturnType<typeof challengeExpiredEvent>;

export type AdjudicatorEventAction =
  | ConcludedEvent
  | RefutedEvent
  | RespondWithMoveEvent
  | FundingReceivedEvent
  | ChallengeExpiredEvent;

export type CommonAction = MessageReceived | CommitmentReceived | AdjudicatorEventAction;
export type ProtocolAction =
  | CommonAction
  | FundingAction
  | TransactionAction
  | challenging.ChallengingAction
  | directFunding.FundingAction
  | indirectFunding.Action
  | WithdrawalAction
  | RespondingAction;

export type WalletAction =
  | AdjudicatorKnown
  | BlockMined
  | DisplayMessageSent
  | LoggedIn
  | MessageSent
  | MetamaskLoadError
  | ProtocolAction
  | protocol.NewProcessAction
  | channel.ChannelAction
  | internal.InternalAction
  | ChallengeCreatedEvent;

function isCommonAction(action: WalletAction): action is CommonAction {
  return (
    [
      MESSAGE_RECEIVED,
      COMMITMENT_RECEIVED,
      CHALLENGE_CREATED_EVENT,
      CONCLUDED_EVENT,
      REFUTED_EVENT,
      RESPOND_WITH_MOVE_EVENT,
      FUNDING_RECEIVED_EVENT,
    ].indexOf(action.type) >= 0
  );
}
export { internal, channel, directFunding as funding, indirectFunding, protocol, isCommonAction };
