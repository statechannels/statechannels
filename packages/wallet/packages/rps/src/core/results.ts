import { Player } from './players';
import { BigNumber } from 'ethers/utils';
import { Weapon } from './rps-commitment';

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
  roundBuyIn: BigNumber,
  balances: BigNumber[],
): BigNumber[] {
  switch (absoluteResult) {
    case AbsoluteResult.AWins:
      return [balances[0].add(roundBuyIn.mul(2)), balances[1].sub(roundBuyIn.mul(2))];
    case AbsoluteResult.BWins:
      return balances;
    case AbsoluteResult.Tie:
      return [balances[0].add(roundBuyIn.mul(1)), balances[1].sub(roundBuyIn.mul(1))];
  }
}
