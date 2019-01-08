export const LOGGED_IN = 'WALLET.LOGGED_IN';
export const loggedIn = (uid: string) => ({
  type: LOGGED_IN as typeof LOGGED_IN,
  uid,
});
export type LoggedIn = ReturnType<typeof loggedIn>;

export const KEYS_LOADED = 'WALLET.KEYS_LOADED';
export const keysLoaded = (address: string, privateKey: string, networkId: string) => ({
  type: KEYS_LOADED as typeof KEYS_LOADED,
  address,
  privateKey,
  // TODO: This should be separated off into its own action
  networkId,
});
export type KeysLoaded = ReturnType<typeof keysLoaded>;

export const CREATE_CHANNEL_REQUEST = ''; // send over opponent addresses, gameLibrary
// return nonce etc.
export const JOIN_CHANNEL_REQUEST = '';
export const ADDRESS_REQUEST = ''; // provide me with an address

export const OWN_POSITION_RECEIVED = 'WALLET.OWN_POSITION_RECEIVED';
export const ownPositionReceived = (data: string) => ({
  type: OWN_POSITION_RECEIVED as typeof OWN_POSITION_RECEIVED,
  data,
});
export type OwnPositionReceived = ReturnType<typeof ownPositionReceived>;

export const CHALLENGE_POSITION_RECEIVED = 'CHALLENGE_POSITION_RECEIVED';
export const challengePositionReceived = (data: string) => ({
  type: CHALLENGE_POSITION_RECEIVED as typeof CHALLENGE_POSITION_RECEIVED,
  data,
});
export type ChallengePositionReceived = ReturnType<typeof challengePositionReceived>;

export const OPPONENT_POSITION_RECEIVED = 'WALLET.OPPONENT_POSITION_RECEIVED';
export const opponentPositionReceived = (data: string, signature: string, ) => ({
  type: OPPONENT_POSITION_RECEIVED as typeof OPPONENT_POSITION_RECEIVED,
  data,
  signature,
});
export type OpponentPositionReceived = ReturnType<typeof opponentPositionReceived>;

export const MESSAGE_RECEIVED = 'WALLET.MESSAGE_RECEIVED';
export const messageReceived = (data: string, signature?: string) => ({
  type: MESSAGE_RECEIVED as typeof MESSAGE_RECEIVED,
  data,
  signature,
});
export type MessageReceived = ReturnType<typeof messageReceived>;

export const MESSAGE_SENT = 'WALLET.MESSAGE_SENT';
export const messageSent = () => ({
  type: MESSAGE_SENT as typeof MESSAGE_SENT,
});
export type MessageSent = ReturnType<typeof messageSent>;


export const FUNDING_REQUESTED = 'WALLET.FUNDING_REQUESTED';
export const fundingRequested = () => ({
  type: FUNDING_REQUESTED as typeof FUNDING_REQUESTED,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;


export const FUNDING_APPROVED = 'WALLET.FUNDING_APPROVED';
export const fundingApproved = () => ({
  type: FUNDING_APPROVED as typeof FUNDING_APPROVED,
});
export type FundingApproved = ReturnType<typeof fundingApproved>;

export const FUNDING_REJECTED = 'WALLET.FUNDING_REJECTED';
export const fundingRejected = () => ({
  type: FUNDING_REJECTED as typeof FUNDING_REJECTED,
});
export type FundingRejected = ReturnType<typeof fundingRejected>;

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

export const FUNDING_SUCCESS_ACKNOWLEDGED = 'WALLET.FUNDING_SUCCESS_ACKNOWLEDGED';
export const fundingSuccessAcknowledged = () => ({
  type: FUNDING_SUCCESS_ACKNOWLEDGED as typeof FUNDING_SUCCESS_ACKNOWLEDGED,
});
export type FundingSuccessAcknowledged = ReturnType<typeof fundingSuccessAcknowledged>;


export const POST_FUND_SETUP_RECEIVED = 'WALLET.POST_FUND_SETUP_RECEIVED'; // when X blocks deep
export const postFundSetupReceived = (data: string, signature: string) => ({
  type: POST_FUND_SETUP_RECEIVED as typeof POST_FUND_SETUP_RECEIVED,
  data,
  signature,
});
export type PostFundSetupReceived = ReturnType<typeof postFundSetupReceived>;

export const CHALLENGE_APPROVED = 'WALLET.CHALLENGE_APPROVED';
export const challengeApproved = () => ({
  type: CHALLENGE_APPROVED as typeof CHALLENGE_APPROVED,
});
export type ChallengeApproved = ReturnType<typeof challengeApproved>;

export const CHALLENGE_REJECTED = 'WALLET.CHALLENGE_REJECTED';
export const challengeRejected = () => ({
  type: CHALLENGE_REJECTED as typeof CHALLENGE_REJECTED,
});
export type ChallengeRejected = ReturnType<typeof challengeRejected>;

export const CHALLENGE_REQUESTED = 'WALLET.CHALLENGE_REQUESTED';
export const challengeRequested = () => ({
  type: CHALLENGE_REQUESTED as typeof CHALLENGE_REQUESTED,
});
export type ChallengeRequested = ReturnType<typeof challengeRequested>;


export const CHALLENGE_RESPONSE_RECEIVED = 'WALLET.CHALLENGE_RESPONSE_RECEIVED';
export const challengeResponseReceived = (data: string) => ({
  type: CHALLENGE_RESPONSE_RECEIVED as typeof CHALLENGE_RESPONSE_RECEIVED,
  data,
});
export type ChallengeResponseReceived = ReturnType<typeof challengeResponseReceived>;

export const CHALLENGE_TIMED_OUT = 'WALLET.CHALLENGE_TIMED_OUT';
export const challengedTimedOut = () => ({
  type: CHALLENGE_TIMED_OUT as typeof CHALLENGE_TIMED_OUT,
});
export type ChallengedTimedOut = ReturnType<typeof challengedTimedOut>;

export const CHALLENGE_TIME_OUT_ACKNOWLEDGED = 'WALLET.CHALLENGE_TIME_OUT_ACKNOWLEDGED';
export const challengedTimedOutAcknowledged = () => ({
  type: CHALLENGE_TIME_OUT_ACKNOWLEDGED as typeof CHALLENGE_TIME_OUT_ACKNOWLEDGED,
});
export type ChallengeTimeoutAcknowledged = ReturnType<typeof challengedTimedOutAcknowledged>;

export const CHALLENGE_RESPONSE_ACKNOWLEDGED = 'WALLET.CHALLENGE_RESPONSE_ACKNOWLEDGED';
export const challengeResponseAcknowledged = () => ({
  type: CHALLENGE_RESPONSE_ACKNOWLEDGED as typeof CHALLENGE_RESPONSE_ACKNOWLEDGED,
});
export type ChallengeResponseAcknowledged = ReturnType<typeof challengeResponseAcknowledged>;

export const CHALLENGE_ACKNOWLEDGED = 'WALLET.CHALLENGE_ACKNOWLEDGED';
export const challengeAcknowledged = () => ({
  type: CHALLENGE_ACKNOWLEDGED as typeof CHALLENGE_ACKNOWLEDGED,
});
export type ChallengeAcknowledged = ReturnType<typeof challengeAcknowledged>;

export const RESPOND_WITH_EXISTING_MOVE_CHOSEN = 'WALLET.RESPOND_WITH_EXISTING_MOVE_CHOSEN';
export const respondWithExistingMoveChosen = () => ({
  type: RESPOND_WITH_EXISTING_MOVE_CHOSEN as typeof RESPOND_WITH_EXISTING_MOVE_CHOSEN,
});
export type RespondWithExistingMoveChosen = ReturnType<typeof respondWithExistingMoveChosen>;

export const RESPOND_WITH_MOVE_CHOSEN = 'WALLET.RESPOND_WITH_MOVE_CHOSEN';
export const respondWithMoveChosen = () => ({
  type: RESPOND_WITH_MOVE_CHOSEN as typeof RESPOND_WITH_MOVE_CHOSEN,
});
export type RespondWithMoveChosen = ReturnType<typeof respondWithMoveChosen>;

export const RESPOND_WITH_REFUTE_CHOSEN = 'WALLET.RESPOND_WITH_REFUTE_CHOSEN';
export const respondWithRefuteChosen = () => ({
  type: RESPOND_WITH_REFUTE_CHOSEN as typeof RESPOND_WITH_REFUTE_CHOSEN,
});
export type RespondWithRefuteChosen = ReturnType<typeof respondWithRefuteChosen>;

export const TAKE_MOVE_IN_APP_ACKNOWLEDGED = 'WALLET.TAKE_MOVE_IN_APP_ACKNOWLEDGED';
export const takeMoveInAppAcknowledged = (position: string, signature: string) => ({
  type: TAKE_MOVE_IN_APP_ACKNOWLEDGED as typeof TAKE_MOVE_IN_APP_ACKNOWLEDGED,
});
export type TakeMoveInAppAcknowledged = ReturnType<typeof takeMoveInAppAcknowledged>;

export const CHALLENGE_COMPLETION_ACKNOWLEDGED = 'WALLET.CHALLENGE_COMPLETION_ACKNOWLEDGED';
export const challengeCompletionAcknowledged = () => ({
  type: CHALLENGE_COMPLETION_ACKNOWLEDGED as typeof CHALLENGE_COMPLETION_ACKNOWLEDGED,
});
export type ChallengeCompletionAcknowledged = ReturnType<typeof challengeCompletionAcknowledged>;

// Common Transaction Actions
export const TRANSACTION_SENT_TO_METAMASK = 'WALLET.TRANSACTION_SENT_TO_METAMASK';
export const transactionSentToMetamask = () => ({
  type: TRANSACTION_SENT_TO_METAMASK as typeof TRANSACTION_SENT_TO_METAMASK,
});
export type TransactionSentToMetamask = ReturnType<typeof transactionSentToMetamask>;

export const TRANSACTION_SUBMISSION_FAILED = 'WALLET.TRANSACTION_SUBMISSION_FAILED';
export const transactionSubmissionFailed = (error: { message?: string, code }) => ({
  error,
  type: TRANSACTION_SUBMISSION_FAILED as typeof TRANSACTION_SUBMISSION_FAILED,
});
export type TransactionSubmissionFailed = ReturnType<typeof transactionSubmissionFailed>;


export const TRANSACTION_SUBMITTED = 'WALLET.TRANSACTION_SUBMITTED';
export const transactionSubmitted = () => ({
  type: TRANSACTION_SUBMITTED as typeof TRANSACTION_SUBMITTED,
});
export type TransactionSubmitted = ReturnType<typeof transactionSubmitted>;

export const TRANSACTION_CONFIRMED = 'WALLET.TRANSACTION_CONFIRMED';
export const transactionConfirmed = (contractAddress?: string) => ({
  type: TRANSACTION_CONFIRMED as typeof TRANSACTION_CONFIRMED,
  contractAddress,
});
export type TransactionConfirmed = ReturnType<typeof transactionConfirmed>;

export const TRANSACTION_FINALIZED = 'WALLET.TRANSACTION_FINALIZED';
export const transactionFinalized = () => ({
  type: TRANSACTION_FINALIZED as typeof TRANSACTION_FINALIZED,
});
export type TransactionFinalized = ReturnType<typeof transactionFinalized>;



export const WITHDRAWAL_REQUESTED = 'WALLET.WITHDRAWAL_REQUESTED';
export const withdrawalRequested = () => ({
  type: WITHDRAWAL_REQUESTED as typeof WITHDRAWAL_REQUESTED,
});
export type WithdrawalRequested = ReturnType<typeof withdrawalRequested>;

export const WITHDRAWAL_APPROVED = 'WALLET.WITHDRAWAL_APPROVED';
export const withdrawalApproved = (destinationAddress: string) => ({
  type: WITHDRAWAL_APPROVED as typeof WITHDRAWAL_APPROVED,
  destinationAddress,
});
export type WithdrawalApproved = ReturnType<typeof withdrawalApproved>;

export const WITHDRAWAL_REJECTED = 'WALLET.WITHDRAWAL_REJECTED';
export const withdrawalRejected = () => ({
  type: WITHDRAWAL_REJECTED as typeof WITHDRAWAL_REJECTED,
});
export type WithdrawalRejected = ReturnType<typeof withdrawalRejected>;

export const WITHDRAWAL_SUCCESS_ACKNOWLEDGED = 'WALLET.WITHDRAWAL_SUCCESS_ACKNOWLEDGED';
export const withdrawalSuccessAcknowledged = () => ({
  type: WITHDRAWAL_SUCCESS_ACKNOWLEDGED as typeof WITHDRAWAL_SUCCESS_ACKNOWLEDGED,
});
export type WithdrawalSuccessAcknowledged = ReturnType<typeof withdrawalSuccessAcknowledged>;

export const FUNDING_RECEIVED_EVENT = 'FUNDING_RECEIVED_EVENT';
export const fundingReceivedEvent = (amountReceived, sender, adjudicatorBalance) => ({
  amountReceived,
  sender,
  adjudicatorBalance,
  type: FUNDING_RECEIVED_EVENT as typeof FUNDING_RECEIVED_EVENT,
});
export type FundingReceivedEvent = ReturnType<typeof fundingReceivedEvent>;

export const CHALLENGE_CREATED_EVENT = 'CHALLENGE_CREATED_EVENT';
export const challengeCreatedEvent = (channelId, state, expirationTime, payouts) => ({
  channelId,
  state,
  expirationTime,
  payouts,
  type: CHALLENGE_CREATED_EVENT as typeof CHALLENGE_CREATED_EVENT,
});
export type ChallengeCreatedEvent = ReturnType<typeof challengeCreatedEvent>;

export const GAME_CONCLUDED_EVENT = 'GAME_CONCLUDED_EVENT';
export const gameConcludedEvent = () => ({
  type: GAME_CONCLUDED_EVENT as typeof GAME_CONCLUDED_EVENT,
});
export type GameConcludedEvent = ReturnType<typeof gameConcludedEvent>;

export const REFUTED_EVENT = 'REFUTED_EVENT';
export const refutedEvent = (refuteState) => ({
  refuteState,
  type: REFUTED_EVENT as typeof REFUTED_EVENT,
});
export type RefutedEvent = ReturnType<typeof refutedEvent>;

export const RESPOND_WITH_MOVE_EVENT = 'RESPOND_WITH_MOVE_EVENT';
export const respondWithMoveEvent = (responseState) => ({
  responseState,
  type: RESPOND_WITH_MOVE_EVENT as typeof RESPOND_WITH_MOVE_EVENT,
});
export type RespondWithMoveEvent = ReturnType<typeof respondWithMoveEvent>;

export const CONCLUDE_REQUESTED = 'WALLET.CONCLUDE_REQUESTED';
export const concludeRequested = () => ({
  type: CONCLUDE_REQUESTED as typeof CONCLUDE_REQUESTED,
});
export type ConcludeRequested = ReturnType<typeof concludeRequested>;

export const CONCLUDE_APPROVED = 'WALLET.CONCLUDE_APPROVED';
export const concludeApproved = () => ({
  type: CONCLUDE_APPROVED as typeof CONCLUDE_APPROVED,
});
export type ConcludeApproved = ReturnType<typeof concludeApproved>;

export const CONCLUDE_REJECTED = 'WALLET.CONCLUDE_REJECTED';
export const concludeRejected = () => ({
  type: CONCLUDE_REJECTED as typeof CONCLUDE_REJECTED,
});
export type ConcludeRejected = ReturnType<typeof concludeRejected>;

export const CLOSE_SUCCESS_ACKNOWLEDGED = 'WALLET.CLOSE_SUCCESS_ACKNOWLEDGED';
export const closeSuccessAcknowledged = () => ({
  type: CLOSE_SUCCESS_ACKNOWLEDGED as typeof CLOSE_SUCCESS_ACKNOWLEDGED,
});
export type CloseSuccessAcknowledged = ReturnType<typeof closeSuccessAcknowledged>;

export const CLOSED_ON_CHAIN_ACKNOWLEDGED = 'WALLET.CLOSED_ON_CHAIN_ACKNOWLEDGED';
export const closedOnChainAcknowledged = () => ({
  type: CLOSED_ON_CHAIN_ACKNOWLEDGED as typeof CLOSED_ON_CHAIN_ACKNOWLEDGED,
});
export type ClosedOnChainAcknowledged = ReturnType<typeof closedOnChainAcknowledged>;

export const APPROVE_CLOSE = 'APPROVE_CLOSE';
export const approveClose = () => ({
  type: APPROVE_CLOSE as typeof APPROVE_CLOSE,
});
export type ApproveClose = ReturnType<typeof approveClose>;

// TODO: This is getting large, we should probably split this up into separate types for each stage
export type WalletAction = (
  | LoggedIn
  | KeysLoaded
  | OwnPositionReceived
  | OpponentPositionReceived
  | FundingRequested
  | FundingApproved
  | FundingRejected
  | FundingReceivedEvent
  | DepositInitiated
  | DepositConfirmed
  | PostFundSetupReceived
  | FundingSuccessAcknowledged
  | ChallengeRequested
  | ChallengeCreatedEvent
  | ChallengeResponseReceived
  | ChallengedTimedOut
  | TakeMoveInAppAcknowledged
  | ChallengeApproved
  | ChallengeRejected
  | ChallengeResponseAcknowledged
  | ChallengeTimeoutAcknowledged
  | ChallengeCompletionAcknowledged
  | ChallengeAcknowledged
  | RespondWithMoveChosen
  | RespondWithExistingMoveChosen
  | RespondWithRefuteChosen
  | WithdrawalRequested
  | WithdrawalApproved
  | WithdrawalRejected
  | TransactionSubmitted
  | TransactionSubmissionFailed
  | TransactionConfirmed
  | TransactionSentToMetamask
  | WithdrawalSuccessAcknowledged
  | MessageReceived
  | MessageSent
  | GameConcludedEvent
  | ConcludeRequested
  | ConcludeApproved
  | CloseSuccessAcknowledged
  | ClosedOnChainAcknowledged
  | RespondWithMoveEvent
  | ChallengePositionReceived
  | ApproveClose
);
