import { ChannelState, Result, Weapon } from '../../core';
import { BigNumber } from 'ethers/utils';

export interface GameState {
  localState: LocalState;
  channelState?: ChannelState;
}

export type LocalState =
  | Empty
  | Lobby
  | WaitingRoom
  | GameChosen
  | ChooseWeapon
  | WeaponChosen
  | WeaponAndSaltChosen
  | ResultPlayAgain
  | WaitForRestart
  | ShuttingDown
  | GameOver;

export interface Empty {
  type: 'Empty';
}

export interface Lobby {
  type: 'Lobby';
  name: string;
  address: string;
}

export interface WaitingRoom {
  type: 'WaitingRoom';
  name: string;
  address: string;
  roundBuyIn: BigNumber;
}

export interface GameChosen {
  type: 'GameChosen';
  player: 'A';
  name: string;
  address: string;
  opponentName: string;
  opponentAddress: string;
  roundBuyIn: BigNumber;
}

export interface Playing {
  player: 'A' | 'B';
  name: string;
  address: string;
  opponentName: string;
  roundBuyIn: BigNumber;
}

export interface ChooseWeapon extends Playing {
  type: 'ChooseWeapon';
}

export interface WeaponChosen extends Playing {
  type: 'WeaponChosen';
  myWeapon: Weapon;
}

export interface WeaponAndSaltChosen extends Playing {
  type: 'WeaponAndSaltChosen';
  myWeapon: Weapon;
  salt: string;
  player: 'A';
}

export interface ResultPlayAgain extends Playing {
  type: 'ResultPlayAgain';
  myWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
}

export interface WaitForRestart extends Playing {
  type: 'WaitForRestart';
}

type ShutDownReason = 'InsufficientFundsYou' | 'InsufficientFundsOpponent' | 'YouResigned';
export interface ShuttingDown extends Playing {
  type: 'ShuttingDown';
  reason: ShutDownReason;
}

export interface GameOver extends Playing {
  type: 'GameOver';
}

// Helpers
// =======

const playing = <T extends Playing>(state: T): Playing => {
  const { player, name, address, opponentName, roundBuyIn } = state;
  return { player, name, address, opponentName, roundBuyIn };
};

export const chooseWeapon = <T extends Playing>(state: T): ChooseWeapon => ({
  type: 'ChooseWeapon',
  ...playing(state),
});

export const weaponChosen = <T extends Playing>(state: T, myWeapon: Weapon): WeaponChosen => ({
  type: 'WeaponChosen',
  ...playing(state),
  myWeapon,
});

export const weaponAndSaltChosen = (
  state: WeaponChosen & { player: 'A' },
  salt: string
): WeaponAndSaltChosen => ({
  ...state,
  type: 'WeaponAndSaltChosen',
  salt,
});

export const resultPlayAgain = (
  state: WeaponChosen | WeaponAndSaltChosen,
  theirWeapon: Weapon,
  result: Result
): ResultPlayAgain => ({
  type: 'ResultPlayAgain',
  ...playing(state),
  myWeapon: state.myWeapon,
  theirWeapon,
  result,
});

export const waitForRestart = <T extends Playing>(state: T): WaitForRestart => ({
  type: 'WaitForRestart',
  ...playing(state),
});

export const shuttingDown = <T extends Playing>(
  state: T,
  reason: ShutDownReason
): ShuttingDown => ({
  type: 'ShuttingDown',
  ...playing(state),
  reason,
});
