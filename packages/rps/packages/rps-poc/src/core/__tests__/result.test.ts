import { Player } from '../players';
import { Move } from '../moves';
import {
  Result,
  calculateResult,
  calculateAbsoluteResult,
  convertToAbsoluteResult,
  convertToRelativeResult,
} from '../results';

function testOutcome(yourMove: Move, theirMove: Move, expectedResult: Result) {
  describe(`When you play ${Move[yourMove]} and they play ${Move[theirMove]}`, () => {
    const relativeResultFromMoves = calculateResult(yourMove, theirMove);

    it(`result gives ${Result[expectedResult]}`, () => {
      expect(relativeResultFromMoves).toEqual(expectedResult);
    });

    describe('when you are player A', () => {
      const absoluteResultFromMoves = calculateAbsoluteResult(yourMove, theirMove);

      const relativeResultFromAbsolute = convertToRelativeResult(absoluteResultFromMoves, Player.PlayerA);
      const absoluteResultFromRelative = convertToAbsoluteResult(relativeResultFromMoves, Player.PlayerA);

      it('relativeResult is consistent with calculateAbsoluteResult', () => {
        expect(relativeResultFromMoves).toEqual(relativeResultFromAbsolute);
      });

      it('absoluteResult is consistent with calculateResult', () => {
        expect(absoluteResultFromRelative).toEqual(absoluteResultFromMoves);
      });
    });

    describe('when you are player A', () => {
      const absoluteResultFromMoves = calculateAbsoluteResult(theirMove, yourMove);

      const relativeResultFromAbsolute = convertToRelativeResult(absoluteResultFromMoves, Player.PlayerB);
      const absoluteResultFromRelative = convertToAbsoluteResult(relativeResultFromMoves, Player.PlayerB);

      it('relativeResult is consistent with calculateAbsoluteResult', () => {
        expect(relativeResultFromMoves).toEqual(relativeResultFromAbsolute);
      });

      it('absoluteResult is consistent with calculateResult', () => {
        expect(absoluteResultFromRelative).toEqual(absoluteResultFromMoves);
      });
    });
  });
}

describe('result', () => {
  testOutcome(Move.Rock, Move.Rock, Result.Tie);
  testOutcome(Move.Rock, Move.Paper, Result.YouLose);
  testOutcome(Move.Rock, Move.Scissors, Result.YouWin);
  testOutcome(Move.Paper, Move.Rock, Result.YouWin);
  testOutcome(Move.Paper, Move.Paper, Result.Tie);
  testOutcome(Move.Paper, Move.Scissors, Result.YouLose);
  testOutcome(Move.Scissors, Move.Rock, Result.YouLose);
  testOutcome(Move.Scissors, Move.Paper, Result.YouWin);
  testOutcome(Move.Scissors, Move.Scissors, Result.Tie);
});
