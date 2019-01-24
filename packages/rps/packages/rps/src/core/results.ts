import { Move } from './moves';
import { Player } from './players';
import BN from 'bn.js';

export enum Result {
  Tie,
  YouWin,
  YouLose,
}

export function calculateResult(yourMove: Move, theirMove: Move): Result {
  const x = (yourMove - theirMove + 2) % 3;
  switch (x) {
    case 0:
      return Result.YouWin;
    case 1:
      return Result.YouLose;
    default:
      return Result.Tie;
  }
}

export function calculateAbsoluteResult(asMove: Move, bsMove: Move): AbsoluteResult {
  const x = (asMove - bsMove + 2) % 3;
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

  switch(relativeResult) {
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

  switch(absoluteResult) {
    case AbsoluteResult.Tie:
      return Result.Tie;
    case AbsoluteResult.AWins:
      return youArePlayerA ? Result.YouWin : Result.YouLose;
    case AbsoluteResult.BWins:
      return youArePlayerA ? Result.YouLose : Result.YouWin;
  }

}

export function balancesAfterResult(absoluteResult: AbsoluteResult, roundBuyIn: BN, balances: [BN, BN]): [BN, BN] {
  switch(absoluteResult) {
    case AbsoluteResult.AWins:
      return [ balances[0].add(roundBuyIn.muln(2)), balances[1].sub(roundBuyIn.muln(2)) ];
    case AbsoluteResult.BWins:
      return balances;
    case AbsoluteResult.Tie:
      return [ balances[0].add(roundBuyIn.muln(1)), balances[1].sub(roundBuyIn.muln(1)) ];
  }
}
