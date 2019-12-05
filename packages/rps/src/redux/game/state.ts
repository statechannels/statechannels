import {ChannelState, Result, Weapon} from '../../core';

export interface GameState {
  localState: LocalState;
  channelState: ChannelState | null;
}

export type LocalState =
  | Setup.Empty
  | Setup.Lobby
  | Setup.NeedAddress
  | A.GameChosen
  | A.ChooseWeapon
  | A.WeaponChosen
  | A.WeaponAndSaltChosen
  | A.ResultPlayAgain
  | A.WaitForRestart
  | B.CreatingOpenGame
  | B.WaitingRoom
  | B.OpponentJoined
  | B.ChooseWeapon
  | B.WeaponChosen
  | B.ResultPlayAgain
  | EndGame.InsufficientFunds
  | EndGame.Resigned
  | EndGame.GameOver;

export interface Playing {
  name: string;
  address: string;
  opponentName: string;
  roundBuyIn: string;
}

// Setup

// tslint:disable-next-line: no-namespace
export namespace Setup {
  export interface Empty {
    type: 'Setup.Empty';
  }

  export interface NeedAddress {
    type: 'Setup.NeedAddress';
    name: string;
  }
  export interface Lobby {
    type: 'Setup.Lobby';
    name: string;
    address: string;
  }
}

// Player A
// tslint:disable-next-line: no-namespace
export namespace A {
  export interface GameChosen {
    type: 'A.GameChosen';
    opponentAddress: string; // need to keep opponentAddress until we have opened the channel
  }

  export interface GameChosen {
    type: 'A.GameChosen';
    opponentAddress: string; // need to keep opponentAddress until we have opened the channel
  }

  export interface ChooseWeapon extends Playing {
    type: 'A.ChooseWeapon';
  }

  export interface WeaponChosen extends Playing {
    type: 'A.WeaponChosen';
    myWeapon: Weapon;
  }

  export interface WeaponAndSaltChosen extends Playing {
    type: 'A.WeaponAndSaltChosen';
    myWeapon: Weapon;
    salt: string;
  }

  export interface ResultPlayAgain extends Playing {
    type: 'A.ResultPlayAgain';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }

  export interface WaitForRestart extends Playing {
    type: 'A.WaitForRestart';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
}

// Player B

// tslint:disable-next-line: no-namespace
export namespace B {
  export interface CreatingOpenGame {
    type: 'B.CreatingOpenGame';
    name: string;
    address: string;
    // libraryAddress: string; // TODO
  }
  export interface WaitingRoom {
    type: 'B.WaitingRoom';
    name: string;
    address: string;
    roundBuyIn: string;
  }

  export interface OpponentJoined extends Playing {
    type: 'B.OpponentJoined';
  }

  export interface ChooseWeapon extends Playing {
    type: 'B.ChooseWeapon';
  }

  export interface WeaponChosen extends Playing {
    type: 'B.WeaponChosen';
    myWeapon: Weapon;
  }

  export interface ResultPlayAgain extends Playing {
    type: 'B.ResultPlayAgain';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
}
// EndGame

// tslint:disable-next-line: no-namespace
export namespace EndGame {
  export interface InsufficientFunds extends Playing {
    type: 'EndGame.InsufficientFunds';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }

  export interface Resigned extends Playing {
    type: 'EndGame.Resigned';
    iResigned: boolean;
  }

  export interface GameOver extends Playing {
    type: 'EndGame.GameOver';
  }
}
