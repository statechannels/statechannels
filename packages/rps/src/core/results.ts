import { Player } from './players';
import { Weapon } from './rps-commitment';
import { bigNumberify } from 'ethers/utils';

export enum Result {
  Tie,
  YouWin,
  YouLose,
}

export function calculateResult(yourWeapon: Weapon, theirWeapon: Weapon): Result {
  const x = (yourWeapon - theirWeapon + 2) % 3;
  switch (x) {
    case 0:
      return Result.YouWin;
    case 1:
      return Result.YouLose;
    default:
      return Result.Tie;
  }
}

export function calculateAbsoluteResult(asWeapon: Weapon, bsWeapon: Weapon): AbsoluteResult {
  const x = (asWeapon - bsWeapon + 2) % 3;
  switch (x) {
    case 0:
      return AbsoluteResult.AWins;
    case 1:
      return AbsoluteResult.BWins;
    default:
      return AbsoluteResult.Tie;
  }
}

export enum AbsoluteResult {
  Tie,
  AWins,
  BWins,
}

export function convertToAbsoluteResult(relativeResult: Result, youAre: Player) {
  const youArePlayerA = youAre === Player.PlayerA;

  switch (relativeResult) {
    case Result.Tie:
      return AbsoluteResult.Tie;
    case Result.YouWin:
      return youArePlayerA ? AbsoluteResult.AWins : AbsoluteResult.BWins;
    case Result.YouLose:
      return youArePlayerA ? AbsoluteResult.BWins : AbsoluteResult.AWins;
  }
}

export function convertToRelativeResult(absoluteResult: AbsoluteResult, youAre: Player): Result {
  const youArePlayerA = youAre === Player.PlayerA;

  switch (absoluteResult) {
    case AbsoluteResult.Tie:
      return Result.Tie;
    case AbsoluteResult.AWins:
      return youArePlayerA ? Result.YouWin : Result.YouLose;
    case AbsoluteResult.BWins:
      return youArePlayerA ? Result.YouLose : Result.YouWin;
  }
}

export function allocationAfterResult(
  absoluteResult: AbsoluteResult,
  roundBuyIn: string,
  balances: [string, string]
): [string, string] {
  switch (absoluteResult) {
    case AbsoluteResult.AWins:
      return [
        bigNumberify(balances[0])
          .add(bigNumberify(roundBuyIn).mul(2))
          .toString(),
        bigNumberify(balances[1])
          .sub(bigNumberify(roundBuyIn).mul(2))
          .toString(),
      ];
    case AbsoluteResult.BWins:
      return balances;
    case AbsoluteResult.Tie:
      return [
        bigNumberify(balances[0])
          .add(bigNumberify(roundBuyIn).mul(1))
          .toString(),
        bigNumberify(balances[1])
          .sub(bigNumberify(roundBuyIn).mul(1))
          .toString(),
      ];
  }
}

export function updateAllocation(
  relativeResult: Result,
  youAre: Player,
  roundBuyIn: string,
  aBal: string,
  bBal: string
): [string, string] {
  return allocationAfterResult(convertToAbsoluteResult(relativeResult, youAre), roundBuyIn, [
    aBal,
    bBal,
  ]);
}
