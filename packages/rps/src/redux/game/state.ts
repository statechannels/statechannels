import { ChannelState, Result, Weapon } from '../../core';

export interface GameState {
  localState: LocalState;
  channelState: ChannelState | null;
}

export type LocalStateWithPlayer =
  | GameChosen
  | OpponentJoined
  | ChooseWeapon
  | WeaponChosen
  | WeaponAndSaltChosen
  | ResultPlayAgain
  | WaitForRestart
  | ShuttingDown
  | GameOver;

export type LocalState =
  | Empty
  | NeedAddress
  | Lobby
  | CreatingOpenGame
  | WaitingRoom
  | LocalStateWithPlayer;
export type PlayingState =
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

export interface NeedAddress {
  type: 'NeedAddress';
  name: string;
}
export interface Lobby {
  type: 'Lobby';
  name: string;
  address: string;
}

export interface CreatingOpenGame {
  type: 'CreatingOpenGame';
  name: string;
  address: string;
  // libraryAddress: string; // TODO
}
export interface WaitingRoom {
  type: 'WaitingRoom';
  name: string;
  address: string;
  roundBuyIn: string;
}

export interface Playing {
  player: 'A' | 'B';
  name: string;
  address: string;
  opponentName: string;
  roundBuyIn: string;
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
  myWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
}

export type ShutDownReason =
  | 'InsufficientFundsYou'
  | 'InsufficientFundsOpponent'
  | 'YouResigned'
  | 'TheyResigned';
export interface ShuttingDown extends Playing {
  type: 'ShuttingDown';
  reason: ShutDownReason;
  myWeapon?: Weapon;
  theirWeapon?: Weapon;
  result?: Result;
}

export interface GameOver extends Playing {
  type: 'GameOver';
  reason: ShutDownReason;
}

// Helpers
// =======

export const needAddress = <T extends Omit<NeedAddress, 'type'>>(state: T): NeedAddress => {
  const { name } = state;
  return { type: 'NeedAddress', name };
};

export const lobby = <T extends Omit<Lobby, 'type'>>(state: T): Lobby => {
  const { name, address } = state;
  return { type: 'Lobby', name, address };
};

export function creatingOpenGame<T extends Omit<CreatingOpenGame, 'type'>>(
  state: T
): CreatingOpenGame {
  const { name, address } = state;
  return { type: 'CreatingOpenGame', name, address };
}

export const waitingRoom = <T extends Omit<WaitingRoom, 'type'>>(state: T): WaitingRoom => {
  const { name, address, roundBuyIn } = state;
  return { type: 'WaitingRoom', name, address, roundBuyIn };
};

const playing = <T extends Playing>(state: T): Playing => {
  const { player, name, address, opponentName, roundBuyIn } = state;
  return { player, name, address, opponentName, roundBuyIn };
};

export const gameChosen = <T extends Omit<Playing, 'player'>>(
  state: T,
  opponentAddress: string
): GameChosen => ({
  type: 'GameChosen',
  ...playing({ ...state, player: 'A' }),
  opponentAddress,
  player: 'A', // otherwise typescript can't tell that player is A
});

export const opponentJoined = <T extends Omit<Playing, 'player'>>(state: T): OpponentJoined => ({
  type: 'OpponentJoined',
  ...playing({ ...state, player: 'B' }),
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

export const weaponAndSaltChosen = <T extends Playing & { myWeapon: Weapon; player: 'A' }>(
  state: T,
  salt: string
): WeaponAndSaltChosen => ({
  type: 'WeaponAndSaltChosen',
  ...playing(state),
  myWeapon: state.myWeapon,
  player: 'A',
  salt,
});

export const resultPlayAgain = <T extends Playing & { myWeapon: Weapon }>(
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

export const waitForRestart = <T extends Playing & { myWeapon: Weapon }>(
  state: T,
  theirWeapon: Weapon,
  result: Result
): WaitForRestart => ({
  type: 'WaitForRestart',
  ...playing(state),
  myWeapon: state.myWeapon,
  theirWeapon,
  result,
});

export const shuttingDown = <T extends Playing & { myWeapon?: Weapon }>(
  state: T,
  reason: ShutDownReason,
  theirWeapon?: Weapon,
  result?: Result
): ShuttingDown => ({
  type: 'ShuttingDown',
  ...playing(state),
  myWeapon: state.myWeapon,
  theirWeapon,
  result,
  reason,
});

export const gameOver = <T extends Playing>(state: T, reason: ShutDownReason): GameOver => ({
  type: 'GameOver',
  ...playing(state),
  reason,
});

// Helpers
// =======

export const isPlayerA = (state: LocalStateWithPlayer): boolean => state.player === 'A';
export const isPlayerB = (state: LocalStateWithPlayer): boolean => state.player === 'B';
export type StateName = LocalState['type'];

export type PlayingStateName = PlayingState['type'];
