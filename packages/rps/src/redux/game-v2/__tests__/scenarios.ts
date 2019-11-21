import {bigNumberify} from 'ethers/utils';
import {AppData, RoundProposed, Start, RoundAccepted, Reveal, hashPreCommit} from '../../../core';
import {ChannelState, Result, Weapon} from '../../../core';
import {LocalState} from '../state';

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

const asDetails = {name: aName, address: aAddress};

const playing = {
  ...asDetails,
  player: 'A' as 'A', // yuk
  opponentName: bName,
  roundBuyIn: bigNumberify(1),
};

export const localStatesA: Record<string, LocalState> = {
  lobby: {type: 'Lobby', ...asDetails},
  gameChosen: {
    type: 'GameChosen',
    ...playing,
    opponentAddress: bAddress,
  },
  chooseWeapon: {type: 'ChooseWeapon', ...playing},
  weaponChosen: {type: 'WeaponChosen', ...playing, myWeapon: playerAWeapon},
  weaponAndSaltChosen: {
    type: 'WeaponAndSaltChosen',
    ...playing,
    myWeapon: playerAWeapon,
    salt,
  },
  resultPlayAgain: {
    type: 'ResultPlayAgain',
    ...playing,
    myWeapon: playerAWeapon,
    theirWeapon: playerBWeapon,
    result: Result.YouWin,
  },
  chooseWeapon2: {type: 'ChooseWeapon', ...playing},
  waitForRestart: {type: 'WaitForRestart', ...playing},
  shuttingDown: {type: 'ShuttingDown', reason: 'InsufficientFundsOpponent', ...playing},
  shuttingDownResign: {type: 'ShuttingDown', reason: 'YouResigned', ...playing},
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
