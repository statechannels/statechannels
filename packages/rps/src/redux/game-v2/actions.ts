import { BigNumber } from 'ethers/utils';
import { ChannelState, Weapon, Result } from '../../core';

export type GameAction =
  | JoinOpenGame
  | UpdateChannelState
  | ChooseWeapon
  | ChooseSalt
  | ResultArrived;

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

export interface ResultArrived {
  type: 'ResultArrived';
  theirWeapon: Weapon;
  result: Result;
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

export const resultArrived = (theirWeapon: Weapon, result: Result): ResultArrived => ({
  type: 'ResultArrived',
  theirWeapon,
  result,
});
