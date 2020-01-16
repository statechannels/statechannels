import {bigNumberify} from 'ethers/utils';
import {AppData, hashPreCommit} from '../../../core';
import {ChannelState, Result, Weapon, ChannelStatus} from '../../../core';
import * as s from '../state';
import {WeiPerEther} from 'ethers/constants';

export const channelId = '0xabc234';
export const channelNonce = 1;
export const aName = 'Alice';
export const bName = 'Bob';
export const aBal = WeiPerEther.mul(5).toString();
export const bBal = WeiPerEther.mul(5).toString();
export const aAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
const aUserId = aAddress;
const bUserId = bAddress;
export const stake = WeiPerEther.toString();
const roundBuyIn = stake;
export const aWeapon = Weapon.Rock;
const playerAWeapon = aWeapon;
export const salt = '0x' + '4'.repeat(64);
const preCommit = hashPreCommit(aWeapon, salt);
export const bWeapon = Weapon.Scissors;
const playerBWeapon = bWeapon;

export const appData: Record<AppData['type'], AppData> = {
  start: {type: 'start'},
  roundProposed: {type: 'roundProposed', stake, preCommit},
  roundAccepted: {type: 'roundAccepted', stake, preCommit, playerBWeapon},
  reveal: {type: 'reveal', playerAWeapon, playerBWeapon, salt},
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
    aOutcomeAddress: aAddress,
    bOutcomeAddress: bAddress,
    aBal: WeiPerEther.mul(balances[0]).toString(),
    bBal: WeiPerEther.mul(balances[1]).toString(),
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
  outcomeAddress: aAddress,
  opponentName: bName,
  roundBuyIn,
  myWeapon: playerAWeapon,
  theirWeapon: playerBWeapon,
  opponentAddress: bAddress,
  opponentOutcomeAddress: bAddress,
  salt,
};

export const localStatesA = {
  lobby: s.Setup.lobby(propsA),
  gameChosen: s.A.gameChosen(propsA),
  chooseWeapon: s.A.chooseWeapon(propsA),
  weaponChosen: s.A.weaponChosen(propsA),
  weaponAndSaltChosen: s.A.weaponAndSaltChosen(propsA),
  resultPlayAgain: s.A.resultPlayAgain({...propsA, result: Result.YouWin}),
  chooseWeapon2: s.A.chooseWeapon(propsA),
  waitForRestart: s.A.waitForRestart({...propsA, result: Result.YouWin}),
  insuffcientFunds: s.A.insufficientFunds({...propsA, result: Result.YouWin}),
  resignedMyTurn: s.A.resigned({...propsA, iResigned: true}),
  resignedTheirTurn: s.A.resigned({...propsA, iResigned: true}),
  gameOver: s.EndGame.gameOver(propsA),
};

const propsB = {
  name: bName,
  address: bAddress,
  outcomeAddress: bAddress,
  opponentName: aName,
  roundBuyIn,
  myWeapon: playerBWeapon,
  theirWeapon: playerAWeapon,
  opponentAddress: aAddress,
  opponentOutcomeAddress: aAddress,
};

export const localStatesB = {
  lobby: s.Setup.lobby(propsB),
  createOpenGame: s.B.creatingOpenGame(propsB),
  waitingRoom: s.B.waitingRoom(propsB),
  opponentJoined: s.B.opponentJoined(propsB),
  chooseWeapon: s.B.chooseWeapon(propsB),
  weaponChosen: s.B.weaponChosen(propsB),
  resultPlayAgain: s.B.resultPlayAgain({...propsB, result: Result.YouLose}),
  chooseWeapon2: s.B.chooseWeapon(propsB),
  insufficientFunds: s.B.insufficientFunds({...propsB, result: Result.YouLose}),
  resignedMyTurn: s.B.resigned({...propsB, iResigned: true}),
  resignedTheirTurn: s.B.resigned({...propsB, iResigned: true}),
  gameOver: s.EndGame.gameOver(propsB),
};
