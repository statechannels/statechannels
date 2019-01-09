import {
  Result,
  calculateResult,
  calculateAbsoluteResult,
  convertToAbsoluteResult,
  convertToRelativeResult,
  Marker,
  midRow,
} from '../results';

import { Marks } from '../marks';

function testOutcome(noughts: Marks, crosses: Marks, you: Marker, expectedResult: Result) {
  let description: string;
  switch (you) {
    case Marker.noughts: { description = `When you play noughts = ${noughts} and crosses = ${crosses}`; } break;
    case Marker.crosses: { description = `When noughts = ${noughts} and you play crosses = ${crosses}`; } break;
    default: description = 'you are not being parsed!!';
  }
  describe(description, () => {

    const relativeResultFromMoves = calculateResult(noughts, crosses, you);

    it(`result gives ${Result[expectedResult]}`, () => {
      expect(relativeResultFromMoves).toEqual(expectedResult);
    });

    const absoluteResultFromMoves = calculateAbsoluteResult(noughts, crosses);

    const relativeResultFromAbsolute = convertToRelativeResult(absoluteResultFromMoves, you);
    const absoluteResultFromRelative = convertToAbsoluteResult(relativeResultFromMoves, you);

    it('relativeResult is consistent with calculateAbsoluteResult', () => {
      expect(relativeResultFromMoves).toEqual(relativeResultFromAbsolute);
    });

    it('absoluteResult is consistent with calculateResult', () => {
      expect(absoluteResultFromRelative).toEqual(absoluteResultFromMoves);
    });
  });
}

describe('result', () => {
  testOutcome(midRow, (Marks.tl | Marks.tr | Marks.bl), Marker.noughts, Result.YouWin);
  testOutcome(0b000111000, 0b101000100, Marker.noughts, Result.YouWin);
  testOutcome(0b001110010, 0b110001101, Marker.noughts, Result.Tie);
  testOutcome(0b001110010, 0b110001101, Marker.crosses, Result.Tie);
  testOutcome(0b100000000, 0b111101010, Marker.crosses, Result.YouWin);
  testOutcome(0b100000000, 0b111101010, Marker.noughts, Result.YouLose);
});
