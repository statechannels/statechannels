import { BigNumber } from 'ethers/utils';
import { ChannelState, Weapon, Result } from '../../core';

export type GameAction =
  | JoinOpenGame
  | UpdateChannelState
  | ChooseWeapon
  | ChooseSalt
  | ResultArrived
  | PlayAgain
  | Restart
  | Resign;

export interface UpdateChannelState {
  type: 'UpdateChannelState';
  channelState: ChannelState;
}

export interface JoinOpenGame {
  type: 'JoinOpenGame';
  opponentName: string;
  opponentAddress: string;
  roundBuyIn: BigNumber;
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

export interface Restart {
  type: 'Restart';
}

export interface Resign {
  type: 'Resign';
}

// Constructors
// ============

export const updateChannelState = (channelState: ChannelState): UpdateChannelState => ({
  type: 'UpdateChannelState',
  channelState,
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
export const restart = (): Restart => ({ type: 'Restart' });
export const resign = (): Resign => ({ type: 'Resign' });
