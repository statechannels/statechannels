import { bigNumberify } from 'ethers/utils';
import { AppData, RoundProposed, Start, RoundAccepted, Reveal, hashPreCommit } from '../../../core';
import { ChannelState, Result, Weapon } from '../../../core';
import {
  Lobby,
  GameChosen,
  ChooseWeapon,
  WeaponChosen,
  WeaponAndSaltChosen,
  ResultPlayAgain,
} from '../state';

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
const fiveFive = [5, 5];
const sixFour = [6, 4];
const fourSix = [4, 6];
export const aWeapon = Weapon.Rock;
const playerAWeapon = aWeapon;
export const salt = '0x' + '4'.repeat(64);
const preCommit = hashPreCommit(aWeapon, salt);
export const bWeapon = Weapon.Scissors;
const playerBWeapon = bWeapon;

const appData = {
  start: { type: 'start' } as Start,
  roundProposed: { type: 'roundProposed', stake, preCommit } as RoundProposed,
  roundAccepted: { type: 'roundAccepted', stake, preCommit, playerBWeapon } as RoundAccepted,
  reveal: { type: 'reveal', playerAWeapon, playerBWeapon, salt } as Reveal,
};

function channelState(
  appDataParam: AppData, // to avoid shadowed outer variable
  turnNum: number,
  balances: number[],
  status = 'running'
): ChannelState {
  return {
    channelId,
    turnNum: bigNumberify(turnNum),
    status,
    aUserId,
    bUserId,
    aDestination,
    bDestination,
    aBal: bigNumberify(balances[0]),
    bBal: bigNumberify(balances[1]),
    appData: appDataParam,
  };
}

export const channelStates = {
  preFund0: channelState(appData.start, 0, fiveFive),
  preFund1: channelState(appData.start, 1, fiveFive),
  postFund0: channelState(appData.start, 2, fiveFive),
  postFund1: channelState(appData.start, 3, fiveFive),
  start: channelState(appData.start, 4, fiveFive),
  roundProposed: channelState(appData.roundProposed, 5, fiveFive),
  roundAccepted: channelState(appData.roundAccepted, 6, fourSix),
  reveal: channelState(appData.roundProposed, 7, sixFour),
};

const asDetails = { name: aName, address: aAddress };

const playing = {
  ...asDetails,
  player: 'A',
  opponentName: bName,
  roundBuyIn: bigNumberify(1),
};

export const localStatesA = {
  lobby: { type: 'Lobby', ...asDetails } as Lobby,
  gameChosen: {
    type: 'GameChosen',
    ...playing,
    address: aAddress,
    opponentAddress: bAddress,
  } as GameChosen,
  chooseWeapon: { type: 'ChooseWeapon', ...playing } as ChooseWeapon,
  weaponChosen: { type: 'WeaponChosen', ...playing, myWeapon: playerAWeapon } as WeaponChosen,
  weaponAndSaltChosen: {
    type: 'WeaponAndSaltChosen',
    ...playing,
    myWeapon: playerAWeapon,
    salt,
  } as WeaponAndSaltChosen,
  resultPlayAgain: {
    type: 'ResultPlayAgain',
    ...playing,
    myWeapon: playerAWeapon,
    theirWeapon: playerBWeapon,
    result: Result.YouWin,
  } as ResultPlayAgain,
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
