import { Result, Imperative, Marks, Player, Marker } from '../../core';

// States of the form *A are player A only
// States of the form *B are player B only
// All other states are both players
export enum StateName {
  NoName = 'NO_NAME',
  Lobby = 'Lobby',
  CreatingOpenGame = 'CREATING_OPEN_GAME',
  WaitingRoom = 'WaitingRoom',
  WaitForGameConfirmationA = 'WAIT_FOR_GAME_CONFIRMATION_A',
  ConfirmGameB = 'CONFIRM_GAME_B',
  DeclineGame = 'DECLINE_GAME_B',
  WaitForFunding = 'WAIT_FOR_FUNDING',
  WaitForPostFundSetup = 'WAIT_FOR_POST_FUND_SETUP',
  OsPickMove = 'OS_PICK_MOVE',
  XsPickMove = 'XS_PICK_MOVE',
  OsWaitForOpponentToPickMove = 'OS_WAIT_FOR_OPPONENT_TO_PICK_MOVE',
  XsWaitForOpponentToPickMove = 'XS_WAIT_FOR_OPPONENT_TO_PICK_MOVE',
  WaitForResting = 'WAIT_FOR_RESTING',
  PlayAgain = 'PLAY_AGAIN',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  WaitToResign = 'WAIT_TO_RESIGN',
  OpponentResigned = 'OPPONENT_RESIGNED',
  WaitForResignationAcknowledgement = 'WAIT_FOR_RESIGNATION_ACKNOWLEDGEMENT',
  GameOver = 'GAME_OVER',
  WaitForWithdrawal = 'WAIT_FOR_WITHDRAWAL',
}

export interface NoName {
  name: StateName.NoName;
  libraryAddress: string;
  myAddress: string;
}

interface NoNameParams {
  myAddress: string;
  libraryAddress: string;
  [x: string]: any;
}

export function noName(obj: NoNameParams): NoName {
  const { myAddress, libraryAddress } = obj;
  return { name: StateName.NoName, myAddress, libraryAddress };
}

export interface Lobby {
  name: StateName.Lobby;
  myName: string;
  myAddress: string;
  twitterHandle: string;
  libraryAddress: string;
}
interface LobbyParams {
  myName: string;
  twitterHandle: string;
  myAddress: string;
  libraryAddress: string;
  [x: string]: any;
}

export function lobby(obj: LobbyParams): Lobby {
  const { myName, myAddress, libraryAddress, twitterHandle } = obj;
  return { name: StateName.Lobby, myName, myAddress, libraryAddress, twitterHandle };
}

export interface CreatingOpenGame {
  name: StateName.CreatingOpenGame;
  myName: string;
  twitterHandle: string;
  myAddress: string;
  libraryAddress: string;
}

export function creatingOpenGame(obj: LobbyParams): CreatingOpenGame {
  const { myName, myAddress, libraryAddress, twitterHandle } = obj;
  return { name: StateName.CreatingOpenGame, myName, myAddress, libraryAddress, twitterHandle };
}

export interface WaitingRoom {
  name: StateName.WaitingRoom;
  myName: string;
  myAddress: string;
  twitterHandle: string;
  libraryAddress: string;
  roundBuyIn: string;
}

interface WaitingRoomParams {
  myName: string;
  roundBuyIn: string;
  myAddress: string;
  twitterHandle: string;
  libraryAddress: string;
  [x: string]: any;
}
export function waitingRoom(obj: WaitingRoomParams): WaitingRoom {
  const { myName, roundBuyIn, libraryAddress, myAddress, twitterHandle } = obj;
  return { name: StateName.WaitingRoom, myName, roundBuyIn, libraryAddress, myAddress, twitterHandle };
}

interface TwoChannel {
  libraryAddress: string;
  channelNonce: number;
  participants: [string, string];
}

export interface Base extends TwoChannel {
  turnNum: number;
  balances: [string, string];
  stateCount: number;
  twitterHandle: string;
  roundBuyIn: string;
  myName: string;
  opponentName: string;
  player: Player;
}


export function base<T extends Base>(state: T): Base {
  const {
    libraryAddress,
    channelNonce,
    participants,
    turnNum,
    balances,
    stateCount,
    roundBuyIn,
    myName,
    opponentName,
    twitterHandle,
    player,
  } = state;

  return {
    libraryAddress,
    channelNonce,
    participants,
    turnNum,
    balances,
    stateCount,
    roundBuyIn,
    myName,
    twitterHandle,
    opponentName,
    player,
  };
}

export function getOpponentAddress<T extends Base>(state: T) {
  return state.participants[1 - state.player];
}

export interface WaitForGameConfirmationA extends Base {
  name: StateName.WaitForGameConfirmationA;
  player: Player.PlayerA;
}
export function waitForGameConfirmationA<T extends Base>(state: T): WaitForGameConfirmationA {
  return { ...base(state), name: StateName.WaitForGameConfirmationA, player: Player.PlayerA };
}

export interface ConfirmGameB extends Base {
  name: StateName.ConfirmGameB;
  player: Player.PlayerB;
}
export function confirmGameB<T extends Base>(state: T): ConfirmGameB {
  return { ...base(state), name: StateName.ConfirmGameB, player: Player.PlayerB };
}

export interface DeclineGameB extends Base {
  name: StateName.DeclineGame;
  player: Player.PlayerB;
}
export function declineGameB<T extends Base>(state: T): DeclineGameB {
  return { ...base(state), name: StateName.DeclineGame, player: Player.PlayerB };
}


export interface WaitForFunding extends Base {
  name: StateName.WaitForFunding;
  player: Player;
}



export function waitForFunding<T extends Base>(state: T): WaitForFunding {
  return { ...base(state), name: StateName.WaitForFunding, player: state.player };
}

export interface WaitForPostFundSetup extends Base {
  name: StateName.WaitForPostFundSetup;
  player: Player;
}


export function waitForPostFundSetup<T extends Base>(state: T): WaitForPostFundSetup {
  return { ...base(state), name: StateName.WaitForPostFundSetup, player: state.player };
}

interface InPlay extends Base {
  player: Player;
  noughts: Marks;
  crosses: Marks;
  onScreenBalances: [string, string];
  you: Marker;
}

export function inPlay<T extends InPlay>(state: T): InPlay {
  return {...base(state), player: state.player, noughts: state.noughts,  crosses: state.crosses,   onScreenBalances: state.onScreenBalances, you: state.you };
}


export interface OsPickMove extends HasResult {
  name: StateName.OsPickMove;
}
export function osPickMove<T extends HasResult>(state: T): OsPickMove {
  return { ...hasResult(state), name: StateName.OsPickMove };
}

export interface XsPickMove extends HasResult {
  name: StateName.XsPickMove;
}

export function xsPickMove<T extends HasResult>(state: T): XsPickMove {
  return { ...hasResult(state), name: StateName.XsPickMove };
}

export interface OsWaitForOpponentToPickMove extends HasResult {
  name: StateName.OsWaitForOpponentToPickMove;
}
export function osWaitForOpponentToPickMove<T extends HasResult>(state: T): OsWaitForOpponentToPickMove {
  return {
    ...hasResult(state),
    name: StateName.OsWaitForOpponentToPickMove,
  };
}

export interface XsWaitForOpponentToPickMove extends HasResult {
  name: StateName.XsWaitForOpponentToPickMove;
}
export function xsWaitForOpponentToPickMove<T extends HasResult>(state: T): XsWaitForOpponentToPickMove {
  return {
    ...hasResult(state),
    name: StateName.XsWaitForOpponentToPickMove,
  };
}

interface HasResult extends InPlay {
  result: Result | Imperative;
}

function hasResult<T extends HasResult>(state: T): HasResult {
  const { result } = state;
  return {...inPlay(state), result };
}

export interface PlayAgain extends HasResult {
  name: StateName.PlayAgain;
}

export function playAgain<T extends HasResult>(state: T): PlayAgain {
  return { ...hasResult(state), name: StateName.PlayAgain };
}

export interface WaitForResting extends HasResult {
  name: StateName.WaitForResting;
}

export function waitForRestingA<T extends HasResult>(state: T): WaitForResting {
  return { ...hasResult(state), name: StateName.WaitForResting};
}

export interface InsufficientFunds extends HasResult {
  name: StateName.InsufficientFunds;
}
export function insufficientFunds<T extends HasResult>(state: T): InsufficientFunds {
  return { ...hasResult(state), name: StateName.InsufficientFunds};
}

export interface WaitToResign extends Base {
  name: StateName.WaitToResign;

}
export function waitToResign<T extends Base>(state: T): WaitToResign {
  return { ...base(state), name: StateName.WaitToResign };
}

export interface OpponentResigned extends Base {
  name: StateName.OpponentResigned;
}
export function opponentResigned<T extends Base>(state: T): OpponentResigned {
  return { ...base(state), name: StateName.OpponentResigned };
}

export interface WaitForResignationAcknowledgement extends Base {
  name: StateName.WaitForResignationAcknowledgement;

}
export function waitForResignationAcknowledgement<T extends Base>(state: T): WaitForResignationAcknowledgement {
  return { ...base(state), name: StateName.WaitForResignationAcknowledgement };
}

export interface GameOver extends Base {
  name: StateName.GameOver;

}
export function gameOver<T extends Base>(state: T): GameOver {
  return { ...base(state), name: StateName.GameOver };
}

export interface WaitForWithdrawal extends Base {
  name: StateName.WaitForWithdrawal;

}
export function waitForWithdrawal<T extends Base>(state: T): WaitForWithdrawal {
  return { ...base(state), name: StateName.WaitForWithdrawal };
}

export type PlayingState = (
  | WaitForGameConfirmationA
  | ConfirmGameB
  | DeclineGameB
  | WaitForFunding
  | WaitForPostFundSetup
  | OsPickMove
  | XsPickMove
  | OsWaitForOpponentToPickMove
  | XsWaitForOpponentToPickMove
  | PlayAgain
  | WaitForResting
  | InsufficientFunds
  | WaitToResign
  | OpponentResigned
  | WaitForResignationAcknowledgement
  | GameOver
  | WaitForWithdrawal
);

export type GameState = (
  | NoName
  | Lobby
  | CreatingOpenGame
  | WaitingRoom
  | PlayingState
);
