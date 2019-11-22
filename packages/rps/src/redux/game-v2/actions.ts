import { BigNumber } from 'ethers/utils';
import { ChannelState, Weapon, Result } from '../../core';
import { ShutDownReason } from './state';

export type GameAction =
  | JoinOpenGame
  | GameJoined
  | CreateGame
  | ChooseWeapon
  | ChooseSalt
  | ResultArrived
  | PlayAgain
  | StartRound
  | Resign
  | GameOver;

export interface UpdateChannelState {
  type: 'UpdateChannelState';
  channelState: ChannelState;
}

export interface CreateGame {
  type: 'CreateGame';
  roundBuyIn: BigNumber;
}

export interface JoinOpenGame {
  type: 'JoinOpenGame';
  opponentName: string;
  opponentAddress: string;
  roundBuyIn: BigNumber;
}

export interface GameJoined {
  type: 'GameJoined';
  opponentName: string;
  opponentAddress: string;
}

export interface ChooseWeapon {
  type: 'ChooseWeapon';
  weapon: Weapon;
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
}

export interface GameOver {
  type: 'GameOver';
  reason: ShutDownReason;
}

// Constructors
// ============

export const updateChannelState = (channelState: ChannelState): UpdateChannelState => ({
  type: 'UpdateChannelState',
  channelState,
});

export const createGame = (roundBuyIn: BigNumber): CreateGame => ({
  type: 'CreateGame',
  roundBuyIn,
});

export const chooseWeapon = (weapon: Weapon): ChooseWeapon => ({ type: 'ChooseWeapon', weapon });

export const chooseSalt = (salt: string): ChooseSalt => ({ type: 'ChooseSalt', salt });

export const joinOpenGame = (
  opponentName: string,
  opponentAddress: string,
  roundBuyIn: BigNumber
): JoinOpenGame => ({
  type: 'JoinOpenGame',
  opponentName,
  opponentAddress,
  roundBuyIn,
});

export const gameJoined = (opponentName: string, opponentAddress: string): GameJoined => ({
  type: 'GameJoined',
  opponentName,
  opponentAddress,
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

export const playAgain = (): PlayAgain => ({ type: 'PlayAgain' });
export const startRound = (): StartRound => ({ type: 'StartRound' });
export const resign = (): Resign => ({ type: 'Resign' });
export const gameOver = (reason: ShutDownReason): GameOver => ({ type: 'GameOver', reason });
