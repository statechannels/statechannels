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

export interface GameOver extends Playing {
  type: 'GameOver';
}

// Helpers
// =======

export const weaponChosen = <T extends Playing>(state: T, myWeapon: Weapon): WeaponChosen => {
  const { player, name, address, opponentName, roundBuyIn } = state;
  return { type: 'WeaponChosen', player, name, address, opponentName, roundBuyIn, myWeapon };
};

export const weaponAndSaltChosen = (
  state: WeaponChosen & { player: 'A' },
  salt: string
): WeaponAndSaltChosen => {
  return { ...state, type: 'WeaponAndSaltChosen', salt };
};

export const resultPlayAgain = (
  state: WeaponChosen | WeaponAndSaltChosen,
  theirWeapon: Weapon,
  result: Result
): ResultPlayAgain => {
  const { player, name, address, opponentName, roundBuyIn, myWeapon } = state;
  return {
    type: 'ResultPlayAgain',
    player,
    name,
    address,
    opponentName,
    roundBuyIn,
    myWeapon,
    theirWeapon,
    result,
  };
};
