import {bigNumberify} from 'ethers/utils';
import {AppData, RoundProposed, Start, RoundAccepted, Reveal, hashPreCommit} from '../../../core';
import {ChannelState, Result, Weapon} from '../../../core';
import {LocalState} from '../state';
import * as s from '../state';

export const channelId = '0xabc234';
const aName = 'Alice';
export const bName = 'Bob';
const aUserId = 'userA';
const bUserId = 'userB';
const aDestination = 'destinationA';
const bDestination = 'destinationB';
const aAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
export const stake = bigNumberify(1);
const roundBuyIn = stake;
export const aWeapon = Weapon.Rock;
const playerAWeapon = aWeapon;
export const salt = '0x' + '4'.repeat(64);
const preCommit = hashPreCommit(aWeapon, salt);
export const bWeapon = Weapon.Scissors;
const playerBWeapon = bWeapon;

const appData = {
  start: {type: 'start'} as Start,
  roundProposed: {type: 'roundProposed', stake, preCommit} as RoundProposed,
  roundAccepted: {type: 'roundAccepted', stake, preCommit, playerBWeapon} as RoundAccepted,
  reveal: {type: 'reveal', playerAWeapon, playerBWeapon, salt} as Reveal,
};

function channelState(
  appDataParam: AppData, // to avoid shadowed outer variable
  turnNum: number,
  balances: number[],
  status = 'running'
): ChannelState {
  return {
    channelId,
    turnNum: bigNumberify(turnNum).toString(),
    status,
    aUserId,
    bUserId,
    aDestination,
    bDestination,
    aBal: bigNumberify(balances[0]).toString(),
    bBal: bigNumberify(balances[1]).toString(),
    appData: appDataParam,
  };
}

export const channelStates = {
  preFund0: channelState(appData.start, 0, [5, 5]),
  preFund1: channelState(appData.start, 1, [5, 5]),
  postFund0: channelState(appData.start, 2, [5, 5]),
  postFund1: channelState(appData.start, 3, [5, 5]),
  concludeFromStart: channelState(appData.start, 4, [5, 5], 'concluding'),
  roundProposed: channelState(appData.roundProposed, 4, [5, 5]),
  roundAccepted: channelState(appData.roundAccepted, 5, [4, 6]),
  concludeFromAccepted: channelState(appData.start, 6, [4, 6], 'concluding'),
  reveal: channelState(appData.reveal, 6, [6, 4]),
  start2: channelState(appData.start, 7, [6, 4]),

  // a wins, so this will move to at [10, 0] next
  roundAcceptedInsufficientFundsB: channelState(appData.roundAccepted, 5, [8, 2]),
  revealInsufficientFundsB: channelState(appData.reveal, 6, [10, 0]),
};

const propsA = {
  name: aName,
  address: aAddress,
  player: 'A' as 'A', // yuk
  opponentName: bName,
  roundBuyIn,
  myWeapon: playerAWeapon,
  theirWeapon: playerBWeapon,
};

export const localStatesA: Record<string, LocalState> = {
  lobby: s.lobby(propsA),
  gameChosen: s.gameChosen(propsA, bAddress),
  chooseWeapon: s.chooseWeapon(propsA),
  weaponChosen: s.weaponChosen(propsA, playerAWeapon),
  weaponAndSaltChosen: s.weaponAndSaltChosen(propsA, salt),
  resultPlayAgain: s.resultPlayAgain(propsA, playerBWeapon, Result.YouWin),
  chooseWeapon2: s.chooseWeapon(propsA),
  waitForRestart: s.waitForRestart(propsA),
  shuttingDown: s.shuttingDown(propsA, 'InsufficientFundsYou'),
  shuttingDownResign: s.shuttingDown(propsA, 'YouResigned'),
};

const propsB = {
  name: bName,
  address: bAddress,
  player: 'B' as 'B', // yuk
  opponentName: aName,
  roundBuyIn,
  myWeapon: playerBWeapon,
  theirWeapon: playerAWeapon,
};

export const localStatesB: Record<string, LocalState> = {
  waitingRoom: s.waitingRoom(propsB),
  opponentJoined: s.opponentJoined(propsB),
  chooseWeapon: s.chooseWeapon(propsB),
  weaponChosen: s.weaponChosen(propsB, propsB.myWeapon),
  resultPlayAgain: s.resultPlayAgain(propsB, playerAWeapon, Result.YouLose),
  chooseWeapon2: s.chooseWeapon(propsB),
};

// player A
// lobby
// -> chooseGame
// gameChosen
// -> channelUpdated
// -> channelUpdated
// -> ...
// ChooseWeapon
// -> weaponChosen
// WeaponChosen
// -> saltChosen
// WeaponAndSaltChosen
// -> channelUpdated, updateState, etc
// ResultAndPlayAgain
// -> playAgain
