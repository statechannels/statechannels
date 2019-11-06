import {Result, Player} from '../../core';
import {Weapon} from '../../core/rps-commitment';
import {Channel} from 'fmg-core';

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
  PickWeapon = 'PICK_WEAPON',
  WaitForOpponentToPickWeaponA = 'WAIT_FOR_OPPONENT_TO_PICK_WEAPON_A',
  WaitForOpponentToPickWeaponB = 'WAIT_FOR_OPPONENT_TO_PICK_WEAPON_B',
  WaitForRevealB = 'WAIT_FOR_REVEAL_B',
  WaitForRestingA = 'WAIT_FOR_RESTING_A',
  PlayAgain = 'PLAY_AGAIN',
  OpponentResigned = 'OPPONENT_RESIGNED',
  WaitForResignationAcknowledgement = 'WAIT_FOR_RESIGNATION_ACKNOWLEDGEMENT',
  GameOver = 'GAME_OVER',
  WaitForWithdrawal = 'WAIT_FOR_WITHDRAWAL',
  PickChallengeWeapon = 'PICK_CHALLENGE_WEAPON',
  ChallengePlayAgain = 'CHALLENGE_PLAY_AGAIN'
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
  const {myAddress, libraryAddress} = obj;
  return {name: StateName.NoName, myAddress, libraryAddress};
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
  const {myName, myAddress, libraryAddress, twitterHandle} = obj;
  return {name: StateName.Lobby, myName, myAddress, libraryAddress, twitterHandle};
}

export interface CreatingOpenGame {
  name: StateName.CreatingOpenGame;
  myName: string;
  twitterHandle: string;
  myAddress: string;
  libraryAddress: string;
}

export function creatingOpenGame(obj: LobbyParams): CreatingOpenGame {
  const {myName, myAddress, libraryAddress, twitterHandle} = obj;
  return {name: StateName.CreatingOpenGame, myName, myAddress, libraryAddress, twitterHandle};
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
  const {myName, roundBuyIn, libraryAddress, myAddress, twitterHandle} = obj;
  return {
    name: StateName.WaitingRoom,
    myName,
    roundBuyIn,
    libraryAddress,
    myAddress,
    twitterHandle
  };
}

interface TwoChannel {
  myAddress: string;
  channel: Channel;
  destination: string[];
}

interface Base extends TwoChannel {
  turnNum: number;
  allocation: string[];
  commitmentCount: number;
  twitterHandle: string;
  roundBuyIn: string;
  myName: string;
  opponentName: string;
  libraryAddress: string;
}

interface IncludesBase extends Base {
  [x: string]: any;
}

export function base(state: IncludesBase) {
  const {
    destination,
    turnNum,
    allocation,
    commitmentCount,
    roundBuyIn,
    myName,
    opponentName,
    twitterHandle,
    player,
    myAddress,
    channel,
    libraryAddress
  } = state;

  return {
    channel,
    destination,
    turnNum,
    allocation,
    commitmentCount,
    roundBuyIn,
    myName,
    twitterHandle,
    opponentName,
    player,
    myAddress,
    libraryAddress
  };
}

export function getOpponentAddress(state: IncludesBase) {
  return state.destination[1 - state.player];
}

export interface WaitForGameConfirmationA extends Base {
  name: StateName.WaitForGameConfirmationA;
  player: Player.PlayerA;
}
export function waitForGameConfirmationA(state: IncludesBase): WaitForGameConfirmationA {
  return {...base(state), name: StateName.WaitForGameConfirmationA, player: Player.PlayerA};
}

export interface ConfirmGameB extends Base {
  name: StateName.ConfirmGameB;
  player: Player.PlayerB;
}
export function confirmGameB(state: IncludesBase): ConfirmGameB {
  return {...base(state), name: StateName.ConfirmGameB, player: Player.PlayerB};
}

export interface DeclineGameB extends Base {
  name: StateName.DeclineGame;
  player: Player.PlayerB;
}
export function declineGameB(state: IncludesBase): DeclineGameB {
  return {...base(state), name: StateName.DeclineGame, player: Player.PlayerB};
}

export interface WaitForFunding extends Base {
  name: StateName.WaitForFunding;
  player: Player;
}
export function waitForFunding(state: IncludesBase): WaitForFunding {
  return {...base(state), name: StateName.WaitForFunding};
}

export interface PickWeapon extends Base {
  name: StateName.PickWeapon;
  player: Player;
}
export function pickWeapon(state: IncludesBase): PickWeapon {
  return {...base(state), name: StateName.PickWeapon};
}

export interface PickChallengeWeapon extends Base {
  name: StateName.PickChallengeWeapon;
  player: Player;
}
export function pickChallengeWeapon(state: IncludesBase): PickChallengeWeapon {
  return {...base(state), name: StateName.PickChallengeWeapon};
}

export interface WaitForOpponentToPickWeaponA extends Base {
  name: StateName.WaitForOpponentToPickWeaponA;
  myWeapon: Weapon;
  salt: string;
  player: Player.PlayerA;
}
interface IncludesWeapon extends IncludesBase {
  myWeapon: Weapon;
}

interface IncludesWeaponAndSalt extends IncludesWeapon {
  salt: string;
}
export function waitForOpponentToPickWeaponA(
  state: IncludesWeaponAndSalt
): WaitForOpponentToPickWeaponA {
  return {
    ...base(state),
    name: StateName.WaitForOpponentToPickWeaponA,
    myWeapon: state.myWeapon,
    salt: state.salt
  };
}

export interface WaitForOpponentToPickWeaponB extends Base {
  name: StateName.WaitForOpponentToPickWeaponB;
  myWeapon: Weapon;
  player: Player.PlayerB;
}
export function waitForOpponentToPickWeaponB(state: IncludesWeapon): WaitForOpponentToPickWeaponB {
  return {
    ...base(state),
    name: StateName.WaitForOpponentToPickWeaponB,
    myWeapon: state.myWeapon
  };
}

export interface WaitForRevealB extends Base {
  name: StateName.WaitForRevealB;
  myWeapon: Weapon;
  player: Player.PlayerB;
  preCommit: string;
}
interface WaitForRevealBParams extends IncludesBase {
  myWeapon: Weapon;
  player: Player.PlayerB;
  preCommit: string;
}
export function waitForRevealB(state: WaitForRevealBParams): WaitForRevealB {
  const {myWeapon, preCommit} = state;
  return {...base(state), name: StateName.WaitForRevealB, myWeapon, preCommit};
}

interface IncludesResult extends IncludesBase {
  myWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
}

export interface PlayAgain extends Base {
  name: StateName.PlayAgain;
  myWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
  player: Player;
}
export function playAgain(state: IncludesResult): PlayAgain {
  const {myWeapon, theirWeapon, result} = state;
  return {...base(state), name: StateName.PlayAgain, myWeapon, theirWeapon, result};
}

export interface WaitForRestingA extends Base {
  name: StateName.WaitForRestingA;
  myWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
  player: Player.PlayerA;
}
export function waitForRestingA(state: IncludesResult): WaitForRestingA {
  const {myWeapon, theirWeapon, result} = state;
  return {...base(state), name: StateName.WaitForRestingA, myWeapon, theirWeapon, result};
}

export interface OpponentResigned extends Base {
  name: StateName.OpponentResigned;
  player: Player;
}
export function opponentResigned(state: IncludesBase): OpponentResigned {
  return {...base(state), name: StateName.OpponentResigned};
}

export interface WaitForResignationAcknowledgement extends Base {
  name: StateName.WaitForResignationAcknowledgement;
  player: Player;
}
export function waitForResignationAcknowledgement(
  state: IncludesBase
): WaitForResignationAcknowledgement {
  return {...base(state), name: StateName.WaitForResignationAcknowledgement};
}

export interface GameOver extends Base {
  name: StateName.GameOver;
  player: Player;
}
export function gameOver(state: IncludesBase): GameOver {
  return {...base(state), name: StateName.GameOver};
}

export interface WaitForWithdrawal extends Base {
  name: StateName.WaitForWithdrawal;
  player: Player;
}
export function waitForWithdrawal(state: IncludesBase): WaitForWithdrawal {
  return {...base(state), name: StateName.WaitForWithdrawal};
}

export interface ChallengePlayAgain extends Base {
  name: StateName.ChallengePlayAgain;
  myWeapon: Weapon;
  theirWeapon: Weapon;
  result: Result;
  player: Player;
}
export function challengePlayAgain(state: IncludesResult): ChallengePlayAgain {
  const {myWeapon, theirWeapon, result} = state;
  return {...base(state), name: StateName.ChallengePlayAgain, myWeapon, theirWeapon, result};
}

export type PlayingState =
  | WaitForGameConfirmationA
  | ConfirmGameB
  | DeclineGameB
  | WaitForFunding
  | PickWeapon
  | WaitForOpponentToPickWeaponA
  | WaitForOpponentToPickWeaponB
  | WaitForRevealB
  | PlayAgain
  | WaitForRestingA
  | OpponentResigned
  | WaitForResignationAcknowledgement
  | GameOver
  | WaitForWithdrawal
  | PickChallengeWeapon
  | ChallengePlayAgain;

export type GameState = NoName | Lobby | CreatingOpenGame | WaitingRoom | PlayingState;
