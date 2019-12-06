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

// TODO BEGIN -- move to devtools
interface Anything {
  [propName: string]: any;
}
// params can we have a generic type that has all of type State's properties except 'type' plus anything else as an optional property
// A function of this type will accept those params and return an object with the type State. The implementation need only add the type field:
export type StateConstructor<State> = (
  params: Pick<State, Exclude<keyof State, 'type'>> & Anything
) => State;
// TODO END -- move to devtools

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
  export const needAddress: StateConstructor<NeedAddress> = params => {
    return { ...params, type: 'Setup.NeedAddress' };
  };
  export interface Lobby {
    type: 'Setup.Lobby';
    name: string;
    address: string;
  }
  export const lobby: StateConstructor<Lobby> = params => {
    return { ...params, type: 'Setup.Lobby' };
  };
}

// Player A
// tslint:disable-next-line: no-namespace
export namespace A {
  export interface GameChosen extends Playing {
    type: 'A.GameChosen';
    opponentAddress: string; // need to keep opponentAddress until we have opened the channel
  }
  export const gameChosen: StateConstructor<GameChosen> = params => {
    return { ...params, type: 'A.GameChosen' };
  };

  export interface ChooseWeapon extends Playing {
    type: 'A.ChooseWeapon';
  }
  export const chooseWeapon: StateConstructor<ChooseWeapon> = params => {
    return { ...params, type: 'A.ChooseWeapon' };
  };

  export interface WeaponChosen extends Playing {
    type: 'A.WeaponChosen';
    myWeapon: Weapon;
  }
  export const weaponChosen: StateConstructor<WeaponChosen> = params => {
    return { ...params, type: 'A.WeaponChosen' };
  };
  export interface WeaponAndSaltChosen extends Playing {
    type: 'A.WeaponAndSaltChosen';
    myWeapon: Weapon;
    salt: string;
  }
  export const weaponAndSaltChosen: StateConstructor<WeaponAndSaltChosen> = params => {
    return { ...params, type: 'A.WeaponAndSaltChosen' };
  };

  export interface ResultPlayAgain extends Playing {
    type: 'A.ResultPlayAgain';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const resultPlayAgain: StateConstructor<ResultPlayAgain> = params => {
    return { ...params, type: 'A.ResultPlayAgain' };
  };

  export interface WaitForRestart extends Playing {
    type: 'A.WaitForRestart';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const waitForRestart: StateConstructor<WaitForRestart> = params => {
    return { ...params, type: 'A.WaitForRestart' };
  };
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
  export const creatingOpenGame: StateConstructor<CreatingOpenGame> = params => {
    return { ...params, type: 'B.CreatingOpenGame' };
  };
  export interface WaitingRoom {
    type: 'B.WaitingRoom';
    name: string;
    address: string;
    roundBuyIn: string;
  }
  export const waitingRoom: StateConstructor<WaitingRoom> = params => {
    return { ...params, type: 'B.WaitingRoom' };
  };

  export interface OpponentJoined extends Playing {
    type: 'B.OpponentJoined';
  }
  export const opponentJoined: StateConstructor<OpponentJoined> = params => {
    return { ...params, type: 'B.OpponentJoined' };
  };

  export interface ChooseWeapon extends Playing {
    type: 'B.ChooseWeapon';
  }
  export const chooseWeapon: StateConstructor<ChooseWeapon> = params => {
    return { ...params, type: 'B.ChooseWeapon' };
  };

  export interface WeaponChosen extends Playing {
    type: 'B.WeaponChosen';
    myWeapon: Weapon;
  }
  export const weaponChosen: StateConstructor<WeaponChosen> = params => {
    return { ...params, type: 'B.WeaponChosen' };
  };

  export interface ResultPlayAgain extends Playing {
    type: 'B.ResultPlayAgain';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const resultPlayAgain: StateConstructor<ResultPlayAgain> = params => {
    return { ...params, type: 'B.ResultPlayAgain' };
  };
}
// EndGame

// tslint:disable-next-line: no-namespace
export namespace EndGame {
  export interface InsufficientFunds {
    type: 'EndGame.InsufficientFunds';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const insufficientFunds: StateConstructor<InsufficientFunds> = params => {
    return { ...params, type: 'EndGame.InsufficientFunds' };
  };

  export interface Resigned {
    type: 'EndGame.Resigned';
    iResigned: boolean;
  }
  export const resigned: StateConstructor<Resigned> = params => {
    return { ...params, type: 'EndGame.Resigned' };
  };

  export interface GameOver {
    type: 'EndGame.GameOver';
  }
  export const gameOver: StateConstructor<GameOver> = params => {
    return { ...params, type: 'EndGame.GameOver' };
  };
}
