import { Move } from './moves';
import { soliditySha3 } from 'web3-utils';
import { padBytes32 } from 'fmg-core';

// Position names
// ==============
export const PRE_FUND_SETUP_A = 'PRE_FUND_SETUP_A';
export const PRE_FUND_SETUP_B = 'PRE_FUND_SETUP_B';
export const POST_FUND_SETUP_A = 'POST_FUND_SETUP_A';
export const POST_FUND_SETUP_B = 'POST_FUND_SETUP_B';
export const PROPOSE = 'PROPOSE';
export const ACCEPT = 'ACCEPT';
export const REVEAL = 'REVEAL';
export const RESTING = 'RESTING';
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

export interface Propose extends BaseWithBuyIn {
  name: typeof PROPOSE;
  preCommit: string;
}

export interface Accept extends BaseWithBuyIn {
  name: typeof ACCEPT;
  preCommit: string;
  bsMove: Move;
}

export interface Reveal extends BaseWithBuyIn {
  name: typeof REVEAL;
  bsMove: Move;
  asMove: Move;
  salt: string;
}

export interface Resting extends BaseWithBuyIn {
  name: typeof RESTING;
}

export interface Resting extends BaseWithBuyIn {
  name: typeof RESTING;
}

export interface Conclude extends Base {
  name: typeof CONCLUDE;
}

export type Position = (
  | PreFundSetupA
  | PreFundSetupB
  | PostFundSetupA
  | PostFundSetupB
  | Propose
  | Accept
  | Reveal
  | Resting
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

function base(obj: BaseParams): Base {
  const { libraryAddress, channelNonce, participants, turnNum, balances } = obj;
  return { libraryAddress, channelNonce, participants, turnNum, balances };
}

function baseWithBuyIn(obj: BaseWithBuyInParams): BaseWithBuyIn {
  return { ...base(obj), roundBuyIn: obj.roundBuyIn };
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

interface ProposeParams extends BaseWithBuyInParams {
  preCommit: string;
}

export function propose(obj: ProposeParams): Propose {
  return { ...baseWithBuyIn(obj), name: PROPOSE, preCommit: obj.preCommit };
}

export function hashCommitment(play: Move, salt: string) {
  return soliditySha3(
    { type: 'uint256', value: play },
    { type: 'bytes32', value: padBytes32(salt) },
  );
}

interface ProposeWithMoveAndSaltParams extends BaseWithBuyInParams {
  salt: string;
  asMove: Move;
}
export function proposeFromSalt(obj: ProposeWithMoveAndSaltParams): Propose {
  const { salt, asMove } = obj;
  const preCommit = hashCommitment(asMove, salt);
  return { ...baseWithBuyIn(obj), name: PROPOSE, preCommit };
}

interface AcceptParams extends BaseWithBuyInParams {
  preCommit: string;
  bsMove: Move;
}

export function accept(obj: AcceptParams): Accept {
  const { preCommit, bsMove } = obj;
  return { ...baseWithBuyIn(obj), name: ACCEPT, preCommit, bsMove };
}

interface RevealParams extends BaseWithBuyInParams {
  bsMove: Move;
  asMove: Move;
  salt: string;
}

export function reveal(obj: RevealParams): Reveal {
  const { asMove, bsMove, salt } = obj;
  return { ...baseWithBuyIn(obj), name: REVEAL, asMove, bsMove, salt };
}

export function resting(obj: BaseWithBuyInParams): Resting {
  return { ...baseWithBuyIn(obj), name: RESTING };
}

export function conclude(obj: BaseParams): Conclude {
  return { ...base(obj), name: CONCLUDE };
}
