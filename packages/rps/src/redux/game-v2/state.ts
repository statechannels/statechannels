import {ChannelState, Result, Weapon} from '../../core';
import {BigNumber} from 'ethers/utils';

export interface GameState {
  localState: LocalState;
  channelState?: ChannelState;
}

export type LocalState =
  | Empty
  | Lobby
  | WaitingRoom
  | GameChosen
  | OpponentJoined
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

export interface Playing {
  player: 'A' | 'B';
  name: string;
  address: string;
  opponentName: string;
  roundBuyIn: BigNumber;
}

export interface GameChosen extends Playing {
  type: 'GameChosen';
  player: 'A';
  opponentAddress: string; // need to keep opponentAddress until we have opened the channel
}

export interface OpponentJoined extends Playing {
  type: 'OpponentJoined';
  player: 'B';
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

export const lobby = <T extends Omit<Lobby, 'type'>>(state: T): Lobby => {
  const {name, address} = state;
  return {type: 'Lobby', name, address};
};

export const waitingRoom = <T extends Omit<WaitingRoom, 'type'>>(state: T): WaitingRoom => {
  const {name, address, roundBuyIn} = state;
  return {type: 'WaitingRoom', name, address, roundBuyIn};
};

const playing = <T extends Playing>(state: T): Playing => {
  const {player, name, address, opponentName, roundBuyIn} = state;
  return {player, name, address, opponentName, roundBuyIn};
};

export const gameChosen = <T extends Omit<Playing, 'player'>>(
  state: T,
  opponentAddress: string
): GameChosen => ({
  type: 'GameChosen',
  ...playing({...state, player: 'A'}),
  opponentAddress,
  player: 'A', // otherwise typescript can't tell that player is A
});

export const opponentJoined = <T extends Omit<Playing, 'player'>>(state: T): OpponentJoined => ({
  type: 'OpponentJoined',
  ...playing({...state, player: 'B'}),
  player: 'B', // otherwise typescript can't tell that player is B
});

export const chooseWeapon = <T extends Playing>(state: T): ChooseWeapon => ({
  type: 'ChooseWeapon',
  ...playing(state),
});

export const weaponChosen = <T extends Playing>(state: T, myWeapon: Weapon): WeaponChosen => ({
  type: 'WeaponChosen',
  ...playing(state),
  myWeapon,
});

export const weaponAndSaltChosen = <T extends Playing & {myWeapon: Weapon; player: 'A'}>(
  state: T,
  salt: string
): WeaponAndSaltChosen => ({
  ...state,
  type: 'WeaponAndSaltChosen',
  salt,
});

export const resultPlayAgain = <T extends Playing & {myWeapon: Weapon}>(
  state: T,
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
