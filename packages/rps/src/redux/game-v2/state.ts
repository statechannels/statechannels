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
  player: 'A';
  myWeapon: Weapon;
  salt: string;
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
