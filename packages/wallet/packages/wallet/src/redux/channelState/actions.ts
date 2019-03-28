import { Commitment } from 'magmo-wallet-client/node_modules/fmg-core';
import * as walletActions from '../actions';

export const CHANNEL_INITIALIZED = 'WALLET.CHANNEL.CHANNEL_INITIALIZED';
export const channelInitialized = () => ({
  type: CHANNEL_INITIALIZED as typeof CHANNEL_INITIALIZED,
});
export type ChannelInitialized = ReturnType<typeof channelInitialized>;

export const CREATE_CHANNEL_REQUEST = ''; // send over opponent addresses, gameLibrary
// return nonce etc.
export const JOIN_CHANNEL_REQUEST = '';
export const ADDRESS_REQUEST = ''; // provide me with an address

export const OWN_COMMITMENT_RECEIVED = 'WALLET.CHANNEL.OWN_COMMITMENT_RECEIVED';
export const ownCommitmentReceived = (commitment: Commitment) => ({
  type: OWN_COMMITMENT_RECEIVED as typeof OWN_COMMITMENT_RECEIVED,
  commitment,
});
export type OwnCommitmentReceived = ReturnType<typeof ownCommitmentReceived>;

export const CHALLENGE_COMMITMENT_RECEIVED = 'WALLET.CHANNEL.CHALLENGE_COMMITMENT_RECEIVED';
export const challengeCommitmentReceived = (commitment: Commitment) => ({
  type: CHALLENGE_COMMITMENT_RECEIVED as typeof CHALLENGE_COMMITMENT_RECEIVED,
  commitment,
});
export type ChallengeCommitmentReceived = ReturnType<typeof challengeCommitmentReceived>;

export const OPPONENT_COMMITMENT_RECEIVED = 'WALLET.CHANNEL.OPPONENT_COMMITMENT_RECEIVED';
export const opponentCommitmentReceived = (commitment: Commitment, signature: string) => ({
  type: OPPONENT_COMMITMENT_RECEIVED as typeof OPPONENT_COMMITMENT_RECEIVED,
  commitment,
  signature,
});
export type OpponentCommitmentReceived = ReturnType<typeof opponentCommitmentReceived>;

export const COMMITMENT_RECEIVED = 'WALLET.CHANNEL.COMMITMENT_RECEIVED';
export const commitmentReceived = (commitment: Commitment, signature: string) => ({
  type: COMMITMENT_RECEIVED as typeof COMMITMENT_RECEIVED,
  commitment,
  signature,
});
export type CommitmentReceived = ReturnType<typeof commitmentReceived>;

export const FUNDING_REQUESTED = 'WALLET.CHANNEL.FUNDING_REQUESTED';
export const fundingRequested = () => ({
  type: FUNDING_REQUESTED as typeof FUNDING_REQUESTED,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;

export const FUNDING_APPROVED = 'WALLET.CHANNEL.FUNDING_APPROVED';
export const fundingApproved = () => ({
  type: FUNDING_APPROVED as typeof FUNDING_APPROVED,
});
export type FundingApproved = ReturnType<typeof fundingApproved>;

export const FUNDING_REJECTED = 'WALLET.CHANNEL.FUNDING_REJECTED';
export const fundingRejected = () => ({
  type: FUNDING_REJECTED as typeof FUNDING_REJECTED,
});
export type FundingRejected = ReturnType<typeof fundingRejected>;

export const FUNDING_SUCCESS_ACKNOWLEDGED = 'WALLET.CHANNEL.FUNDING_SUCCESS_ACKNOWLEDGED';
export const fundingSuccessAcknowledged = () => ({
  type: FUNDING_SUCCESS_ACKNOWLEDGED as typeof FUNDING_SUCCESS_ACKNOWLEDGED,
});
export type FundingSuccessAcknowledged = ReturnType<typeof fundingSuccessAcknowledged>;

export const FUNDING_DECLINED_ACKNOWLEDGED = 'WALLET.CHANNEL.FUNDING_DECLINED_ACKNOWLEDGED';
export const fundingDeclinedAcknowledged = () => ({
  type: FUNDING_DECLINED_ACKNOWLEDGED as typeof FUNDING_DECLINED_ACKNOWLEDGED,
});
export type FundingDeclinedAcknowledged = ReturnType<typeof fundingDeclinedAcknowledged>;

export const POST_FUND_SETUP_RECEIVED = 'WALLET.CHANNEL.POST_FUND_SETUP_RECEIVED'; // when X blocks deep
export const postFundSetupReceived = (data: string, signature: string) => ({
  type: POST_FUND_SETUP_RECEIVED as typeof POST_FUND_SETUP_RECEIVED,
  data,
  signature,
});
export type PostFundSetupReceived = ReturnType<typeof postFundSetupReceived>;

export const CHALLENGE_APPROVED = 'WALLET.CHANNEL.CHALLENGE_APPROVED';
export const challengeApproved = () => ({
  type: CHALLENGE_APPROVED as typeof CHALLENGE_APPROVED,
});
export type ChallengeApproved = ReturnType<typeof challengeApproved>;

export const CHALLENGE_REJECTED = 'WALLET.CHANNEL.CHALLENGE_REJECTED';
export const challengeRejected = () => ({
  type: CHALLENGE_REJECTED as typeof CHALLENGE_REJECTED,
});
export type ChallengeRejected = ReturnType<typeof challengeRejected>;

export const CHALLENGE_REQUESTED = 'WALLET.CHANNEL.CHALLENGE_REQUESTED';
export const challengeRequested = () => ({
  type: CHALLENGE_REQUESTED as typeof CHALLENGE_REQUESTED,
});
export type ChallengeRequested = ReturnType<typeof challengeRequested>;

export const CHALLENGE_RESPONSE_RECEIVED = 'WALLET.CHANNEL.CHALLENGE_RESPONSE_RECEIVED';
export const challengeResponseReceived = (data: string) => ({
  type: CHALLENGE_RESPONSE_RECEIVED as typeof CHALLENGE_RESPONSE_RECEIVED,
  data,
});
export type ChallengeResponseReceived = ReturnType<typeof challengeResponseReceived>;

export const CHALLENGE_TIME_OUT_ACKNOWLEDGED = 'WALLET.CHANNEL.CHALLENGE_TIME_OUT_ACKNOWLEDGED';
export const challengedTimedOutAcknowledged = () => ({
  type: CHALLENGE_TIME_OUT_ACKNOWLEDGED as typeof CHALLENGE_TIME_OUT_ACKNOWLEDGED,
});
export type ChallengeTimeoutAcknowledged = ReturnType<typeof challengedTimedOutAcknowledged>;

export const CHALLENGE_RESPONSE_ACKNOWLEDGED = 'WALLET.CHANNEL.CHALLENGE_RESPONSE_ACKNOWLEDGED';
export const challengeResponseAcknowledged = () => ({
  type: CHALLENGE_RESPONSE_ACKNOWLEDGED as typeof CHALLENGE_RESPONSE_ACKNOWLEDGED,
});
export type ChallengeResponseAcknowledged = ReturnType<typeof challengeResponseAcknowledged>;

export const CHALLENGE_ACKNOWLEDGED = 'WALLET.CHANNEL.CHALLENGE_ACKNOWLEDGED';
export const challengeAcknowledged = () => ({
  type: CHALLENGE_ACKNOWLEDGED as typeof CHALLENGE_ACKNOWLEDGED,
});
export type ChallengeAcknowledged = ReturnType<typeof challengeAcknowledged>;

export const RESPOND_WITH_EXISTING_MOVE_CHOSEN = 'WALLET.CHANNEL.RESPOND_WITH_EXISTING_MOVE_CHOSEN';
export const respondWithExistingMoveChosen = () => ({
  type: RESPOND_WITH_EXISTING_MOVE_CHOSEN as typeof RESPOND_WITH_EXISTING_MOVE_CHOSEN,
});
export type RespondWithExistingMoveChosen = ReturnType<typeof respondWithExistingMoveChosen>;

export const RESPOND_WITH_MOVE_CHOSEN = 'WALLET.CHANNEL.RESPOND_WITH_MOVE_CHOSEN';
export const respondWithMoveChosen = () => ({
  type: RESPOND_WITH_MOVE_CHOSEN as typeof RESPOND_WITH_MOVE_CHOSEN,
});
export type RespondWithMoveChosen = ReturnType<typeof respondWithMoveChosen>;

export const RESPOND_WITH_REFUTE_CHOSEN = 'WALLET.CHANNEL.RESPOND_WITH_REFUTE_CHOSEN';
export const respondWithRefuteChosen = () => ({
  type: RESPOND_WITH_REFUTE_CHOSEN as typeof RESPOND_WITH_REFUTE_CHOSEN,
});
export type RespondWithRefuteChosen = ReturnType<typeof respondWithRefuteChosen>;

export const TAKE_MOVE_IN_APP_ACKNOWLEDGED = 'WALLET.CHANNEL.TAKE_MOVE_IN_APP_ACKNOWLEDGED';
export const takeMoveInAppAcknowledged = (COMMITMENT: string, signature: string) => ({
  type: TAKE_MOVE_IN_APP_ACKNOWLEDGED as typeof TAKE_MOVE_IN_APP_ACKNOWLEDGED,
});
export type TakeMoveInAppAcknowledged = ReturnType<typeof takeMoveInAppAcknowledged>;

export const CHALLENGE_COMPLETION_ACKNOWLEDGED = 'WALLET.CHANNEL.CHALLENGE_COMPLETION_ACKNOWLEDGED';
export const challengeCompletionAcknowledged = () => ({
  type: CHALLENGE_COMPLETION_ACKNOWLEDGED as typeof CHALLENGE_COMPLETION_ACKNOWLEDGED,
});
export type ChallengeCompletionAcknowledged = ReturnType<typeof challengeCompletionAcknowledged>;

export const WITHDRAWAL_REQUESTED = 'WALLET.CHANNEL.WITHDRAWAL_REQUESTED';
export const withdrawalRequested = () => ({
  type: WITHDRAWAL_REQUESTED as typeof WITHDRAWAL_REQUESTED,
});
export type WithdrawalRequested = ReturnType<typeof withdrawalRequested>;

export const WITHDRAWAL_APPROVED = 'WALLET.CHANNEL.WITHDRAWAL_APPROVED';
export const withdrawalApproved = (destinationAddress: string) => ({
  type: WITHDRAWAL_APPROVED as typeof WITHDRAWAL_APPROVED,
  destinationAddress,
});
export type WithdrawalApproved = ReturnType<typeof withdrawalApproved>;

export const WITHDRAWAL_REJECTED = 'WALLET.CHANNEL.WITHDRAWAL_REJECTED';
export const withdrawalRejected = () => ({
  type: WITHDRAWAL_REJECTED as typeof WITHDRAWAL_REJECTED,
});
export type WithdrawalRejected = ReturnType<typeof withdrawalRejected>;

export const WITHDRAWAL_SUCCESS_ACKNOWLEDGED = 'WALLET.CHANNEL.WITHDRAWAL_SUCCESS_ACKNOWLEDGED';
export const withdrawalSuccessAcknowledged = () => ({
  type: WITHDRAWAL_SUCCESS_ACKNOWLEDGED as typeof WITHDRAWAL_SUCCESS_ACKNOWLEDGED,
});
export type WithdrawalSuccessAcknowledged = ReturnType<typeof withdrawalSuccessAcknowledged>;

export const CHALLENGE_CREATED_EVENT = 'WALLET.CHANNEL.CHALLENGE_CREATED_EVENT';
export const challengeCreatedEvent = (channelId: string, commitment: Commitment, finalizedAt) => ({
  channelId,
  commitment,
  finalizedAt,
  type: CHALLENGE_CREATED_EVENT as typeof CHALLENGE_CREATED_EVENT,
});
export type ChallengeCreatedEvent = ReturnType<typeof challengeCreatedEvent>;

export const CONCLUDED_EVENT = 'WALLET.CHANNEL.CONCLUDED_EVENT';
export const concludedEvent = channelId => ({
  channelId,
  type: CONCLUDED_EVENT as typeof CONCLUDED_EVENT,
});
export type concludedEvent = ReturnType<typeof concludedEvent>;

export const REFUTED_EVENT = 'WALLET.CHANNEL.REFUTED_EVENT';
export const refutedEvent = (channelId, refuteCommitment) => ({
  channelId,
  refuteCommitment,
  type: REFUTED_EVENT as typeof REFUTED_EVENT,
});
export type RefutedEvent = ReturnType<typeof refutedEvent>;

export const RESPOND_WITH_MOVE_EVENT = 'WALLET.CHANNEL.RESPOND_WITH_MOVE_EVENT';
export const respondWithMoveEvent = (channelId, responseCommitment) => ({
  channelId,
  responseCommitment,
  type: RESPOND_WITH_MOVE_EVENT as typeof RESPOND_WITH_MOVE_EVENT,
});
export type RespondWithMoveEvent = ReturnType<typeof respondWithMoveEvent>;

export const CONCLUDE_REQUESTED = 'WALLET.CHANNEL.CONCLUDE_REQUESTED';
export const concludeRequested = () => ({
  type: CONCLUDE_REQUESTED as typeof CONCLUDE_REQUESTED,
});
export type ConcludeRequested = ReturnType<typeof concludeRequested>;

export const CONCLUDE_APPROVED = 'WALLET.CHANNEL.CONCLUDE_APPROVED';
export const concludeApproved = () => ({
  type: CONCLUDE_APPROVED as typeof CONCLUDE_APPROVED,
});
export type ConcludeApproved = ReturnType<typeof concludeApproved>;

export const CONCLUDE_REJECTED = 'WALLET.CHANNEL.CONCLUDE_REJECTED';
export const concludeRejected = () => ({
  type: CONCLUDE_REJECTED as typeof CONCLUDE_REJECTED,
});
export type ConcludeRejected = ReturnType<typeof concludeRejected>;

export const CLOSE_SUCCESS_ACKNOWLEDGED = 'WALLET.CHANNEL.CLOSE_SUCCESS_ACKNOWLEDGED';
export const closeSuccessAcknowledged = () => ({
  type: CLOSE_SUCCESS_ACKNOWLEDGED as typeof CLOSE_SUCCESS_ACKNOWLEDGED,
});
export type CloseSuccessAcknowledged = ReturnType<typeof closeSuccessAcknowledged>;

export const CLOSED_ON_CHAIN_ACKNOWLEDGED = 'WALLET.CHANNEL.CLOSED_ON_CHAIN_ACKNOWLEDGED';
export const closedOnChainAcknowledged = () => ({
  type: CLOSED_ON_CHAIN_ACKNOWLEDGED as typeof CLOSED_ON_CHAIN_ACKNOWLEDGED,
});
export type ClosedOnChainAcknowledged = ReturnType<typeof closedOnChainAcknowledged>;

export const APPROVE_CLOSE = 'WALLET.CHANNEL.APPROVE_CLOSE';
export const approveClose = (withdrawAddress: string) => ({
  type: APPROVE_CLOSE as typeof APPROVE_CLOSE,
  withdrawAddress,
});
export type ApproveClose = ReturnType<typeof approveClose>;

export const MESSAGE_RECEIVED = 'WALLET.CHANNEL.MESSAGE_RECEIVED';
export const messageReceived = (data: 'FundingDeclined') => ({
  type: MESSAGE_RECEIVED as typeof MESSAGE_RECEIVED,
  data,
});
export type MessageReceived = ReturnType<typeof messageReceived>;

export type ChannelAction =  // TODO: Some of these actions probably also belong in a FundingAction type
  | ApproveClose
  | ChallengeAcknowledged
  | ChallengeApproved
  | ChallengeCommitmentReceived
  | ChallengeCompletionAcknowledged
  | ChallengeCreatedEvent
  | ChallengeRejected
  | ChallengeRequested
  | ChallengeResponseAcknowledged
  | ChallengeResponseReceived
  | ChallengeTimeoutAcknowledged
  | ChannelInitialized
  | ClosedOnChainAcknowledged
  | CloseSuccessAcknowledged
  | CommitmentReceived
  | ConcludeApproved
  | concludedEvent
  | ConcludeRejected
  | ConcludeRequested
  | FundingApproved
  | FundingDeclinedAcknowledged
  | FundingRejected
  | FundingRequested
  | FundingSuccessAcknowledged
  | MessageReceived
  | OpponentCommitmentReceived
  | OwnCommitmentReceived
  | PostFundSetupReceived
  | RespondWithExistingMoveChosen
  | RespondWithMoveChosen
  | RespondWithMoveEvent
  | RespondWithRefuteChosen
  | TakeMoveInAppAcknowledged
  | WithdrawalApproved
  | WithdrawalRejected
  | WithdrawalRequested
  | WithdrawalSuccessAcknowledged
  | walletActions.CommonAction
  | walletActions.internal.InternalChannelAction;

export const isChannelAction = (action: walletActions.WalletAction): action is ChannelAction => {
  // Most of these are actually targetted at the active application channel, and can
  // probably be namespaced as such.
  return action.type.match('WALLET.CHANNEL')
    ? true
    : walletActions.internal.isChannelAction(action)
    ? true
    : walletActions.isCommonAction(action)
    ? true
    : false;
};

export const isReceiveFirstCommitment = (
  action: walletActions.WalletAction,
): action is OwnCommitmentReceived | OpponentCommitmentReceived => {
  return 'commitment' in action && action.commitment.turnNum === 0;
};
