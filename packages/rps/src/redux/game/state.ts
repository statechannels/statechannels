import {ChannelState, Result, Weapon} from '../../core';

export interface GameState {
  localState: LocalState;
  channelState: ChannelState | null;
}

export type Setup = Setup.Empty | Setup.Lobby | Setup.NeedAddress;
export type A =
  | A.GameChosen
  | A.ChooseWeapon
  | A.WeaponChosen
  | A.WeaponAndSaltChosen
  | A.ResultPlayAgain
  | A.WaitForRestart
  | A.Resigned
  | A.InsufficientFunds;

export function isPlayerA(state: LocalState): state is A {
  return (
    state.type === 'A.GameChosen' ||
    state.type === 'A.ChooseWeapon' ||
    state.type === 'A.WeaponChosen' ||
    state.type === 'A.WeaponAndSaltChosen' ||
    state.type === 'A.ResultPlayAgain' ||
    state.type === 'A.WaitForRestart' ||
    state.type === 'A.Resigned' ||
    state.type === 'A.InsufficientFunds'
  );
}
export type B =
  | B.CreatingOpenGame
  | B.WaitingRoom
  | B.OpponentJoined
  | B.ChooseWeapon
  | B.WeaponChosen
  | B.ResultPlayAgain
  | B.WaitForRestart
  | B.Resigned
  | B.InsufficientFunds;

export function isPlayerB(state: LocalState): state is A {
  return (
    state.type === 'B.CreatingOpenGame' ||
    state.type === 'B.WaitingRoom' ||
    state.type === 'B.OpponentJoined' ||
    state.type === 'B.ChooseWeapon' ||
    state.type === 'B.WeaponChosen' ||
    state.type === 'B.ResultPlayAgain' ||
    state.type === 'B.WaitForRestart' ||
    state.type === 'B.Resigned' ||
    state.type === 'B.InsufficientFunds'
  );
}
export type EndGame = EndGame.GameOver;
export type LocalState = Setup | A | B | EndGame;

export interface Playing {
  name: string;
  address: string;
  outcomeAddress: string;
  opponentName: string;
  roundBuyIn: string;
  opponentAddress: string;
  opponentOutcomeAddress: string;
}

function extractPlayingFromParams(params: Playing & Anything) {
  return {
    name: params.name,
    address: params.address,
    outcomeAddress: params.outcomeAddress,
    opponentName: params.opponentName,
    roundBuyIn: params.roundBuyIn,
    opponentAddress: params.opponentAddress,
    opponentOutcomeAddress: params.opponentOutcomeAddress,
  };
}

// TODO BEGIN -- move to devtools
interface Anything {
  [propName: string]: any;
}
// params can we have a generic type that has all of type State's properties except 'type' plus anything else as an optional property
// A function of this type will accept those params and return an object with the type State. The implementation needs to all desired remaining properties off params:
export type StateConstructor<State> = (
  params: Pick<State, Exclude<keyof State, 'type'>> & Anything
) => State;
// TODO END -- move to devtools

// Setup

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Setup {
  export interface Empty {
    type: 'Setup.Empty';
  }

  export interface NeedAddress {
    type: 'Setup.NeedAddress';
    name: string;
  }
  export const needAddress: StateConstructor<NeedAddress> = params => {
    return {name: params.name, type: 'Setup.NeedAddress'};
  };
  export interface Lobby {
    type: 'Setup.Lobby';
    name: string;
    address: string;
    outcomeAddress: string;
  }
  export const lobby: StateConstructor<Lobby> = params => {
    return {
      name: params.name,
      address: params.address,
      outcomeAddress: params.outcomeAddress,
      type: 'Setup.Lobby',
    };
  };
}

// Player A
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace A {
  export interface GameChosen extends Playing {
    type: 'A.GameChosen';
  }
  export const gameChosen: StateConstructor<GameChosen> = params => {
    return {
      ...extractPlayingFromParams(params),
      type: 'A.GameChosen',
    };
  };

  export interface ChooseWeapon extends Playing {
    type: 'A.ChooseWeapon';
  }
  export const chooseWeapon: StateConstructor<ChooseWeapon> = params => {
    return {...extractPlayingFromParams(params), type: 'A.ChooseWeapon'};
  };

  export interface WeaponChosen extends Playing {
    type: 'A.WeaponChosen';
    myWeapon: Weapon;
  }
  export const weaponChosen: StateConstructor<WeaponChosen> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      type: 'A.WeaponChosen',
    };
  };
  export interface WeaponAndSaltChosen extends Playing {
    type: 'A.WeaponAndSaltChosen';
    myWeapon: Weapon;
    salt: string;
  }
  export const weaponAndSaltChosen: StateConstructor<WeaponAndSaltChosen> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      salt: params.salt,
      type: 'A.WeaponAndSaltChosen',
    };
  };

  export interface ResultPlayAgain extends Playing {
    type: 'A.ResultPlayAgain';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const resultPlayAgain: StateConstructor<ResultPlayAgain> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      theirWeapon: params.theirWeapon,
      result: params.result,
      type: 'A.ResultPlayAgain',
    };
  };

  export interface WaitForRestart extends Playing {
    type: 'A.WaitForRestart';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const waitForRestart: StateConstructor<WaitForRestart> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      theirWeapon: params.theirWeapon,
      result: params.result,
      type: 'A.WaitForRestart',
    };
  };

  export interface Resigned extends Playing {
    type: 'A.Resigned';
    iResigned: boolean;
  }
  export const resigned: StateConstructor<Resigned> = params => {
    return {
      ...extractPlayingFromParams(params),
      iResigned: params.iResigned,
      type: 'A.Resigned',
    };
  };

  export interface InsufficientFunds extends Playing {
    type: 'A.InsufficientFunds';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const insufficientFunds: StateConstructor<InsufficientFunds> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      theirWeapon: params.theirWeapon,
      result: params.result,
      type: 'A.InsufficientFunds',
    };
  };
}

// Player B

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace B {
  export interface CreatingOpenGame {
    type: 'B.CreatingOpenGame';
    name: string;
    address: string;
    outcomeAddress: string;
    // libraryAddress: string; // TODO
  }
  export const creatingOpenGame: StateConstructor<CreatingOpenGame> = params => {
    return {
      name: params.name,
      address: params.address,
      outcomeAddress: params.outcomeAddress,
      type: 'B.CreatingOpenGame',
    };
  };
  export interface WaitingRoom {
    type: 'B.WaitingRoom';
    name: string;
    address: string;
    outcomeAddress: string;
    roundBuyIn: string;
  }
  export const waitingRoom: StateConstructor<WaitingRoom> = params => {
    return {
      name: params.name,
      address: params.address,
      outcomeAddress: params.outcomeAddress,
      roundBuyIn: params.roundBuyIn,
      type: 'B.WaitingRoom',
    };
  };

  export interface OpponentJoined extends Playing {
    type: 'B.OpponentJoined';
  }
  export const opponentJoined: StateConstructor<OpponentJoined> = params => {
    return {...extractPlayingFromParams(params), type: 'B.OpponentJoined'};
  };

  export interface ChooseWeapon extends Playing {
    type: 'B.ChooseWeapon';
  }
  export const chooseWeapon: StateConstructor<ChooseWeapon> = params => {
    return {...extractPlayingFromParams(params), type: 'B.ChooseWeapon'};
  };

  export interface WeaponChosen extends Playing {
    type: 'B.WeaponChosen';
    myWeapon: Weapon;
  }
  export const weaponChosen: StateConstructor<WeaponChosen> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      type: 'B.WeaponChosen',
    };
  };

  export interface ResultPlayAgain extends Playing {
    type: 'B.ResultPlayAgain';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const resultPlayAgain: StateConstructor<ResultPlayAgain> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      theirWeapon: params.theirWeapon,
      result: params.result,
      type: 'B.ResultPlayAgain',
    };
  };

  export interface WaitForRestart extends Playing {
    type: 'B.WaitForRestart';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const waitForRestart: StateConstructor<WaitForRestart> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      theirWeapon: params.theirWeapon,
      result: params.result,
      type: 'B.WaitForRestart',
    };
  };

  export interface Resigned extends Playing {
    type: 'B.Resigned';
    iResigned: boolean;
  }
  export const resigned: StateConstructor<Resigned> = params => {
    return {
      ...extractPlayingFromParams(params),
      iResigned: params.iResigned,
      type: 'B.Resigned',
    };
  };

  export interface InsufficientFunds extends Playing {
    type: 'B.InsufficientFunds';
    myWeapon: Weapon;
    theirWeapon: Weapon;
    result: Result;
  }
  export const insufficientFunds: StateConstructor<InsufficientFunds> = params => {
    return {
      ...extractPlayingFromParams(params),
      myWeapon: params.myWeapon,
      theirWeapon: params.theirWeapon,
      result: params.result,
      type: 'B.InsufficientFunds',
    };
  };
}
// EndGame

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EndGame {
  export interface GameOver {
    type: 'EndGame.GameOver';
    name: string;
    address: string;
    outcomeAddress: string;
  }
  export const gameOver: StateConstructor<GameOver> = params => {
    return {
      name: params.name,
      address: params.address,
      outcomeAddress: params.outcomeAddress,
      type: 'EndGame.GameOver',
    };
  };
}
