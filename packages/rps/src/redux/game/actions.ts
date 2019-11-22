import { Weapon, RPSCommitment } from '../../core/rps-commitment';

export const UPDATE_PROFILE = 'LOGIN.UPDATE_PROFILE';
export const JOIN_OPEN_GAME = 'GAME.JOIN_OPEN_GAME';
export const NEW_OPEN_GAME = 'GAME.NEW_OPEN_GAME';
export const CREATE_OPEN_GAME = 'GAME.CREATE_OPEN_GAME';
export const CANCEL_OPEN_GAME = 'GAME.CANCEL_OPEN_GAME';
export const INITIAL_COMMITMENT_RECEIVED = 'GAME.INITIAL_COMMITMENT_RECEIVED';
export const CONFIRM_GAME = 'GAME.CONFIRM_GAME';
export const DECLINE_GAME = 'GAME.DECLINE_GAME';
export const CHOOSE_WEAPON = 'GAME.CHOOSE_WEAPON';
export const PLAY_AGAIN = 'GAME.PLAY_AGAIN';
export const RESIGN = 'GAME.RESIGN';
export const COMMITMENT_RECEIVED = 'GAME.COMMITMENT_RECEIVED';
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
  roundBuyIn: string
) => ({
  type: JOIN_OPEN_GAME as typeof JOIN_OPEN_GAME,
  opponentName,
  opponentAddress,
  channelNonce,
  roundBuyIn,
});

export const initialCommitmentReceived = (commitment: RPSCommitment, opponentName: string) => ({
  type: INITIAL_COMMITMENT_RECEIVED as typeof INITIAL_COMMITMENT_RECEIVED,
  commitment,
  opponentName,
});

export const confirmGame = () => ({
  type: CONFIRM_GAME as typeof CONFIRM_GAME,
});
export const declineGame = () => ({
  type: DECLINE_GAME as typeof DECLINE_GAME,
});

export const chooseWeapon = (weapon: Weapon) => ({
  type: CHOOSE_WEAPON as typeof CHOOSE_WEAPON,
  weapon,
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

export const commitmentReceived = (commitment: RPSCommitment) => ({
  type: COMMITMENT_RECEIVED as typeof COMMITMENT_RECEIVED,
  commitment,
});

export const fundingSuccess = (commitment: RPSCommitment) => ({
  type: FUNDING_SUCCESS as typeof FUNDING_SUCCESS,
  commitment,
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

export type InitialCommitmentReceived = ReturnType<typeof initialCommitmentReceived>;
export type NewOpenGame = ReturnType<typeof newOpenGame>;
export type CancelOpenGame = ReturnType<typeof cancelOpenGame>;
export type JoinOpenGame = ReturnType<typeof joinOpenGame>;
export type ConfirmGame = ReturnType<typeof confirmGame>;
export type DeclineGame = ReturnType<typeof declineGame>;
export type ChooseWeapon = ReturnType<typeof chooseWeapon>;
export type PlayAgain = ReturnType<typeof playAgain>;
export type Resign = ReturnType<typeof resign>;
export type CommitmentReceived = ReturnType<typeof commitmentReceived>;
export type FundingSuccess = ReturnType<typeof fundingSuccess>;
export type FundingFailure = ReturnType<typeof fundingFailure>;
export type CreateOpenGame = ReturnType<typeof createOpenGame>;
export type ExitToLobby = ReturnType<typeof exitToLobby>;
export type UpdateProfile = ReturnType<typeof updateProfile>;
export type MessageSent = ReturnType<typeof messageSent>;
export type CreateChallenge = ReturnType<typeof createChallenge>;
export type ChallengeResponseRequested = ReturnType<typeof challengeResponseRequested>;
export type ChallengeCompleted = ReturnType<typeof challengeCompleted>;

export type GameAction =
  | UpdateProfile
  | NewOpenGame
  | CancelOpenGame
  | CreateOpenGame
  | ConfirmGame
  | DeclineGame
  | JoinOpenGame
  | ChooseWeapon
  | PlayAgain
  | CommitmentReceived
  | FundingSuccess
  | FundingFailure
  | Resign
  | InitialCommitmentReceived
  | ExitToLobby
  | MessageSent
  | CreateChallenge
  | ChallengeResponseRequested
  | ChallengeCompleted;
