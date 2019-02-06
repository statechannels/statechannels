import {Marks} from './marks';
// Position names
// ==============
export const PRE_FUND_SETUP_A = 'PRE_FUND_SETUP_A';
export const PRE_FUND_SETUP_B = 'PRE_FUND_SETUP_B';
export const POST_FUND_SETUP_A = 'POST_FUND_SETUP_A';
export const POST_FUND_SETUP_B = 'POST_FUND_SETUP_B';
export const OPLAYING = 'OPLAYING';
export const XPLAYING = 'XPLAYING';
export const VICTORY = 'VICTORY';
export const DRAW = 'DRAW';
export const PLAY_AGAIN_ME_FIRST = 'PLAY_AGAIN_ME_FIRST';
export const PLAY_AGAIN_ME_SECOND = 'PLAY_AGAIN_ME_SECOND';
export const CONCLUDE = 'CONCLUDE';

// Positions
// =========

// Properties shared by every position
interface Base {
  libraryAddress: string;
  channelNonce: number;
  participants: [string, string];
  turnNum: number;
  balances: [string, string];
}

// All positions apart from Conclude also have the buyIn
interface BaseWithBuyIn extends Base {
    roundBuyIn: string;
  }


  interface BaseWitNoughtsAndCrossesAndBuyIn extends BaseWithBuyIn {
    noughts: Marks;
    crosses: Marks;
  }
  
  export interface PreFundSetupA extends BaseWithBuyIn {
    stateCount: 0;
    name: typeof PRE_FUND_SETUP_A;
  }
  
  export interface PreFundSetupB extends BaseWithBuyIn {
    stateCount: 1;
    name: typeof PRE_FUND_SETUP_B;
  }
  
  export interface PostFundSetupA extends BaseWithBuyIn {
    stateCount: 0;
    name: typeof POST_FUND_SETUP_A;
  }
  
  export interface PostFundSetupB extends BaseWithBuyIn {
    stateCount: 1;
    name: typeof POST_FUND_SETUP_B;
  }
  

  export interface PlayAgainMeFirst extends BaseWithBuyIn {
    name: typeof PLAY_AGAIN_ME_FIRST;
  }

  export interface PlayAgainMeSecond extends BaseWithBuyIn {
    name: typeof PLAY_AGAIN_ME_SECOND;
  }

  export interface OPlaying extends BaseWitNoughtsAndCrossesAndBuyIn {
    name: typeof OPLAYING;
  }

  export interface XPlaying extends BaseWitNoughtsAndCrossesAndBuyIn {
    name: typeof XPLAYING;
  }
  
  export interface Victory extends BaseWitNoughtsAndCrossesAndBuyIn {
    name: typeof VICTORY;
  }

  export interface Draw extends BaseWitNoughtsAndCrossesAndBuyIn {
    name: typeof DRAW;
  }

  export interface Conclude extends Base {
    name: typeof CONCLUDE;
  }
  
  export type Position = (
    | PreFundSetupA
    | PreFundSetupB
    | PostFundSetupA
    | PostFundSetupB
    | XPlaying
    | OPlaying
    | Victory
    | Draw
    | PlayAgainMeFirst
    | PlayAgainMeSecond
    | Conclude
  );


// Position Constructors
// =====================

// Will be useful to be able to construct these positions from any object
// that includes the right properties
interface BaseParams extends Base {
  [x: string]: any;
}

interface BaseWithBuyInParams extends BaseParams {
  roundBuyIn: string;
}

interface PlayingParams extends BaseWithBuyInParams {
  noughts: Marks;
  crosses: Marks;
}


function base(obj: BaseParams): Base {
  const { libraryAddress, channelNonce, participants, turnNum, balances } = obj;
  return { libraryAddress, channelNonce, participants, turnNum, balances };
}

function baseWithBuyIn(obj: BaseWithBuyInParams): BaseWithBuyIn {
  return { ...base(obj), roundBuyIn: obj.roundBuyIn };
}

function baseWithNoughtsAndCrossesAndBuyIn(obj: PlayingParams): BaseWitNoughtsAndCrossesAndBuyIn {
  const { roundBuyIn, noughts, crosses } = obj;
  return { ...base(obj), roundBuyIn, noughts, crosses };
}

export function preFundSetupA(obj: BaseWithBuyInParams): PreFundSetupA {
  return { ...baseWithBuyIn(obj), name: PRE_FUND_SETUP_A, stateCount: 0 };
}

export function preFundSetupB(obj: BaseWithBuyInParams): PreFundSetupB {
  return { ...baseWithBuyIn(obj), name: PRE_FUND_SETUP_B, stateCount: 1 };
}

export function postFundSetupA(obj: BaseWithBuyInParams): PostFundSetupA {
  return { ...baseWithBuyIn(obj), name: POST_FUND_SETUP_A, stateCount: 0 };
}

export function postFundSetupB(obj: BaseWithBuyInParams): PostFundSetupB {
  return { ...baseWithBuyIn(obj), name: POST_FUND_SETUP_B, stateCount: 1 };
}

export function playAgainMeFirst(obj: BaseWithBuyInParams): PlayAgainMeFirst {
  return { ...baseWithBuyIn(obj), name: PLAY_AGAIN_ME_FIRST };
}

export function playAgainMeSecond(obj: BaseWithBuyInParams): PlayAgainMeSecond {
  return { ...baseWithBuyIn(obj), name: PLAY_AGAIN_ME_SECOND };
}

export function oPlaying(obj: PlayingParams): OPlaying {
  return { ...baseWithNoughtsAndCrossesAndBuyIn(obj), name: OPLAYING};
}

export function xPlaying(obj: PlayingParams): XPlaying {
  return { ...baseWithNoughtsAndCrossesAndBuyIn(obj), name: XPLAYING };
}

export function victory(obj: PlayingParams): Victory {
  return { ...baseWithNoughtsAndCrossesAndBuyIn(obj), name: VICTORY };
}

export function draw(obj: PlayingParams): Draw {
  return { ...baseWithNoughtsAndCrossesAndBuyIn(obj), name: DRAW };
}

export function conclude(obj: BaseParams): Conclude {
  return { ...base(obj), name: CONCLUDE };
}






