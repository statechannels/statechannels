import { Marks, Position, positions } from '../../core';

export const UPDATE_PROFILE = 'LOGIN.UPDATE_PROFILE';
export const JOIN_OPEN_GAME = 'GAME.JOIN_OPEN_GAME';
export const NEW_OPEN_GAME = 'GAME.NEW_OPEN_GAME';
export const CREATE_OPEN_GAME = 'GAME.CREATE_OPEN_GAME';
export const CANCEL_OPEN_GAME = 'GAME.CANCEL_OPEN_GAME';
export const INITIAL_POSITION_RECEIVED = 'GAME.INITIAL_POSITION_RECEIVED';
export const CONFIRM_GAME = 'GAME.CONFIRM_GAME';
export const DECLINE_GAME = 'GAME.DECLINE_GAME';
export const MARKS_MADE = 'GAME.MARKS_MADE';
export const PLAY_AGAIN = 'GAME.PLAY_AGAIN';
export const RESIGN = 'GAME.RESIGN';
export const POSITION_RECEIVED = 'GAME.POSITION_RECEIVED';
export const FUNDING_SUCCESS = 'GAME.FUNDING_SUCCESS';
export const FUNDING_FAILURE = 'GAME.FUNDING_FAILURE';
export const EXIT_TO_LOBBY = 'GAME.EXIT_TO_LOBBY';
export const MESSAGE_SENT = 'GAME.MESSAGE_SENT';
export const CREATE_CHALLENGE = 'GAME.CREATE_CHALLENGE';
export const RESPOND_TO_CHALLENGE = 'GAME.RESPOND_TO_CHALLENGE';
export const CHALLENGE_RESPONSE_REQUESTED = 'GAME.CHALLENGE_RESPONSE_REQUESTED';
export const CHALLENGE_COMPLETED = 'GAME.CHALLENGE_COMPLETED';

export const updateProfile = (name: string, twitterHandle: string) => ({
  type: UPDATE_PROFILE as typeof UPDATE_PROFILE,
  name,
  twitterHandle,
});

export const newOpenGame = () => ({
  type: NEW_OPEN_GAME as typeof NEW_OPEN_GAME,
});

export const cancelOpenGame = () => ({
  type: CANCEL_OPEN_GAME as typeof CANCEL_OPEN_GAME,
});

export const joinOpenGame = (
  opponentName: string,
  opponentAddress: string,
  channelNonce: number,
  roundBuyIn: string,
) => ({
  type: JOIN_OPEN_GAME as typeof JOIN_OPEN_GAME,
  opponentName,
  opponentAddress,
  channelNonce,
  roundBuyIn,
});

export const initialPositionReceived = (position: positions.PreFundSetupA, opponentName: string) => ({
  type: INITIAL_POSITION_RECEIVED as typeof INITIAL_POSITION_RECEIVED,
  position,
  opponentName,
});

export const confirmGame = () => ({
  type: CONFIRM_GAME as typeof CONFIRM_GAME,
});
export const declineGame = () => ({
  type: DECLINE_GAME as typeof DECLINE_GAME,
});

export const marksMade = (marks: Marks) => ({
  type: MARKS_MADE as typeof MARKS_MADE,
  marks,
});

export const playAgain = () => ({
  type: PLAY_AGAIN as typeof PLAY_AGAIN,
});

export const resign = () => ({
  type: RESIGN as typeof RESIGN,
});

export const createChallenge = () => ({
  type: CREATE_CHALLENGE as typeof CREATE_CHALLENGE,
});

export const challengeResponseRequested = () => ({
  type: CHALLENGE_RESPONSE_REQUESTED as typeof CHALLENGE_RESPONSE_REQUESTED,
});

export const challengeCompleted = () => ({
  type: CHALLENGE_COMPLETED as typeof CHALLENGE_COMPLETED,
});

export const positionReceived = (position: Position) => ({
  type: POSITION_RECEIVED as typeof POSITION_RECEIVED,
  position,
});

export const fundingSuccess = (position: Position) => ({
  type: FUNDING_SUCCESS as typeof FUNDING_SUCCESS,
  position,
});

export const fundingFailure = () => ({
  type: FUNDING_FAILURE as typeof FUNDING_FAILURE,
});

export const createOpenGame = (roundBuyIn: string) => ({
  type: CREATE_OPEN_GAME as typeof CREATE_OPEN_GAME,
  roundBuyIn,
});

export const exitToLobby = () => ({
  type: EXIT_TO_LOBBY as typeof EXIT_TO_LOBBY,
});

// TODO: Should this be moved?
export const messageSent = () => ({
  type: MESSAGE_SENT as typeof MESSAGE_SENT,
});

export type InitialPositionReceived = ReturnType<typeof initialPositionReceived>;
export type NewOpenGame = ReturnType<typeof newOpenGame>;
export type CancelOpenGame = ReturnType<typeof cancelOpenGame>;
export type JoinOpenGame = ReturnType<typeof joinOpenGame>;
export type ConfirmGame = ReturnType<typeof confirmGame>;
export type DeclineGame = ReturnType<typeof declineGame>;
export type MarksMade = ReturnType<typeof marksMade>;
export type PlayAgain = ReturnType<typeof playAgain>;
export type Resign = ReturnType<typeof resign>;
export type PositionReceived = ReturnType<typeof positionReceived>;
export type FundingSuccess = ReturnType<typeof fundingSuccess>;
export type FundingFailure = ReturnType<typeof fundingFailure>;
export type CreateOpenGame = ReturnType<typeof createOpenGame>;
export type ExitToLobby = ReturnType<typeof exitToLobby>;
export type UpdateProfile = ReturnType<typeof updateProfile>;
export type MessageSent = ReturnType<typeof messageSent>;
export type CreateChallenge = ReturnType<typeof createChallenge>;
export type ChallengeResponseRequested = ReturnType<typeof challengeResponseRequested>;
export type ChallengeCompleted = ReturnType<typeof challengeCompleted>;

export type GameAction = (
  | UpdateProfile
  | NewOpenGame
  | CancelOpenGame
  | CreateOpenGame
  | ConfirmGame
  | DeclineGame
  | JoinOpenGame
  | MarksMade
  | PlayAgain
  | PositionReceived
  | FundingSuccess
  | FundingFailure
  | Resign
  | InitialPositionReceived
  | ExitToLobby
  | MessageSent
  | CreateChallenge
  | ChallengeResponseRequested
  | ChallengeCompleted
);
