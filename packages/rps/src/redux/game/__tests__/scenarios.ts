import { bigNumberify } from 'ethers/utils';
import { AppData, hashPreCommit } from '../../../core';
import { ChannelState, Result, Weapon, ChannelStatus } from '../../../core';
import * as s from '../state';

export const channelId = '0xabc234';
export const channelNonce = 1;
export const aName = 'Alice';
export const bName = 'Bob';
export const aBal = bigNumberify(5).toString();
export const bBal = bigNumberify(5).toString();
export const aAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
const aUserId = aAddress;
const bUserId = bAddress;
export const stake = bigNumberify(1).toString();
const roundBuyIn = stake;
export const aWeapon = Weapon.Rock;
const playerAWeapon = aWeapon;
export const salt = '0x' + '4'.repeat(64);
const preCommit = hashPreCommit(aWeapon, salt);
export const bWeapon = Weapon.Scissors;
const playerBWeapon = bWeapon;

export const appData: Record<AppData['type'], AppData> = {
  start: { type: 'start' },
  roundProposed: { type: 'roundProposed', stake, preCommit },
  roundAccepted: { type: 'roundAccepted', stake, preCommit, playerBWeapon },
  reveal: { type: 'reveal', playerAWeapon, playerBWeapon, salt },
};

function channelState(
  appDataParam: AppData, // to avoid shadowed outer variable
  turnNum: number,
  balances: number[],
  status: ChannelStatus = 'running'
): ChannelState {
  return {
    channelId,
    turnNum: bigNumberify(turnNum).toString(),
    status,
    aUserId,
    bUserId,
    aAddress,
    bAddress,
    aBal: bigNumberify(balances[0]).toString(),
    bBal: bigNumberify(balances[1]).toString(),
    appData: appDataParam,
  };
}

export const channelStates = {
  preFund0: channelState(appData.start, 0, [5, 5], 'proposed'),
  preFund1: channelState(appData.start, 1, [5, 5], 'opening'),
  postFund0: channelState(appData.start, 2, [5, 5], 'opening'),
  postFund1: channelState(appData.start, 3, [5, 5], 'opening'),
  ready: channelState(appData.start, 3, [5, 5], 'running'),
  concludeFromStart: channelState(appData.start, 4, [5, 5], 'closing'),
  roundProposed: channelState(appData.roundProposed, 4, [5, 5]),
  concludeFromProposed: channelState(appData.roundProposed, 5, [5, 5]),
  roundAccepted: channelState(appData.roundAccepted, 5, [4, 6]),
  concludeFromAccepted: channelState(appData.start, 6, [4, 6], 'closing'),
  reveal: channelState(appData.reveal, 6, [6, 4]),
  start2: channelState(appData.start, 7, [6, 4]),

  // a wins, so this will move to at [10, 0] next
  roundAcceptedInsufficientFundsB: channelState(appData.roundAccepted, 5, [8, 2]),
  revealInsufficientFundsB: channelState(appData.reveal, 6, [10, 0]),
  concludeInsufficientFundsB: channelState(appData.reveal, 7, [10, 0]),

  closed: channelState(appData.start, 8, [10, 0], 'closed'),
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

export const localStatesA = {
  lobby: s.lobby(propsA),
  gameChosen: s.gameChosen(propsA, bAddress),
  chooseWeapon: s.chooseWeapon(propsA),
  weaponChosen: s.weaponChosen(propsA, playerAWeapon),
  weaponAndSaltChosen: s.weaponAndSaltChosen(propsA, salt),
  resultPlayAgain: s.resultPlayAgain(propsA, playerBWeapon, Result.YouWin),
  chooseWeapon2: s.chooseWeapon(propsA),
  waitForRestart: s.waitForRestart(propsA, playerBWeapon, Result.YouWin),
  shuttingDown: s.shuttingDown(propsA, 'InsufficientFundsOpponent', playerBWeapon, Result.YouWin),
  shuttingDownResign: s.shuttingDown(
    { ...propsA, myWeapon: undefined },
    'YouResigned',
    undefined,
    undefined
  ),
  gameOverYouResigned: s.gameOver(propsA, 'YouResigned'),
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

export const localStatesB = {
  lobby: s.lobby(propsB),
  waitingRoom: s.waitingRoom(propsB),
  opponentJoined: s.opponentJoined(propsB),
  chooseWeapon: s.chooseWeapon(propsB),
  weaponChosen: s.weaponChosen(propsB, propsB.myWeapon),
  resultPlayAgain: s.resultPlayAgain(propsB, playerAWeapon, Result.YouLose),
  chooseWeapon2: s.chooseWeapon(propsB),
  shuttingDown: s.shuttingDown(propsB, 'InsufficientFundsYou', playerAWeapon, Result.YouLose),
  shuttingDownResign: s.shuttingDown(
    { ...propsB, myWeapon: undefined },
    'YouResigned',
    undefined,
    undefined
  ),
  gameOverResign: s.gameOver(propsB, 'YouResigned'),
};
