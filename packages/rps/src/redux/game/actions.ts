import {ChannelState, Weapon, Result} from '../../core';

export type GameAction =
  | UpdateProfile
  | GotAddressFromWallet
  | NewOpenGame
  | JoinOpenGame
  | GameJoined
  | CreateGame
  | CancelGame
  | ChooseWeapon
  | ChooseSalt
  | ResultArrived
  | PlayAgain
  | StartRound
  | Resign
  | GameOver
  | ExitToLobby;

export interface UpdateProfile {
  type: 'UpdateProfile';
  name: string;
  twitterHandle: string;
}

export interface GotAddressFromWallet {
  type: 'GotAddressFromWallet';
  address: string;
  outcomeAddress: string;
}
export interface UpdateChannelState {
  type: 'UpdateChannelState';
  channelState: ChannelState;
}

export interface NewOpenGame {
  type: 'NewOpenGame';
}
export interface CreateGame {
  type: 'CreateGame';
  roundBuyIn: string;
}

export interface CancelGame {
  type: 'CancelGame';
}

export interface JoinOpenGame {
  type: 'JoinOpenGame';
  opponentName: string;
  opponentAddress: string;
  opponentOutcomeAddress: string;
  roundBuyIn: string;
}

export interface GameJoined {
  type: 'GameJoined';
  opponentName: string;
  opponentAddress: string;
  opponentOutcomeAddress: string;
}

export interface ChooseWeapon {
  type: 'ChooseWeapon';
  myWeapon: Weapon;
}

export interface ChooseSalt {
  type: 'ChooseSalt';
  salt: string;
}

export type FundingSituation = 'Ok' | 'MyFundsTooLow' | 'OpponentsFundsTooLow';
export interface ResultArrived {
  type: 'ResultArrived';
  theirWeapon: Weapon;
  result: Result;
  fundingSituation: FundingSituation;
}

export interface PlayAgain {
  type: 'PlayAgain';
}

export interface StartRound {
  type: 'StartRound';
}

export interface Resign {
  type: 'Resign';
  iResigned: boolean;
}

export interface GameOver {
  type: 'GameOver';
}

export interface ExitToLobby {
  type: 'ExitToLobby';
}

// Constructors
// ============

export const updateProfile = (name: string, twitterHandle: string): UpdateProfile => ({
  type: 'UpdateProfile',
  name,
  twitterHandle,
});

export const gotAddressFromWallet = (
  address: string,
  outcomeAddress: string
): GotAddressFromWallet => ({
  type: 'GotAddressFromWallet',
  address,
  outcomeAddress,
});

export const updateChannelState = (channelState: ChannelState): UpdateChannelState => ({
  type: 'UpdateChannelState',
  channelState,
});

export const newOpenGame = (): NewOpenGame => ({
  type: 'NewOpenGame',
});

export const createGame = (roundBuyIn: string): CreateGame => ({
  type: 'CreateGame',
  roundBuyIn,
});

export const cancelGame = (): CancelGame => ({
  type: 'CancelGame',
});

export const chooseWeapon = (myWeapon: Weapon): ChooseWeapon => ({
  type: 'ChooseWeapon',
  myWeapon,
});

export const chooseSalt = (salt: string): ChooseSalt => ({type: 'ChooseSalt', salt});

export const joinOpenGame = (
  opponentName: string,
  opponentAddress: string,
  opponentOutcomeAddress: string,
  roundBuyIn: string
): JoinOpenGame => ({
  type: 'JoinOpenGame',
  opponentName,
  opponentAddress,
  opponentOutcomeAddress,
  roundBuyIn,
});

export const gameJoined = (
  opponentName: string,
  opponentAddress: string,
  opponentOutcomeAddress: string
): GameJoined => ({
  type: 'GameJoined',
  opponentName,
  opponentAddress,
  opponentOutcomeAddress,
});

export const resultArrived = (
  theirWeapon: Weapon,
  result: Result,
  fundingSituation: FundingSituation
): ResultArrived => ({
  type: 'ResultArrived',
  theirWeapon,
  result,
  fundingSituation,
});

export const playAgain = (): PlayAgain => ({type: 'PlayAgain'});
export const startRound = (): StartRound => ({type: 'StartRound'});
export const resign = (iResigned: boolean): Resign => ({
  type: 'Resign',
  iResigned,
});
export const gameOver = (): GameOver => ({type: 'GameOver'});
export const exitToLobby = (): ExitToLobby => ({type: 'ExitToLobby'});
