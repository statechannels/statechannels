import { Play, Result, calculateResult } from '.';

function testOutcome(aPlay: Play, bPlay: Play, expectedResult: Result) {
  it(`Gives ${Result[expectedResult]} when a plays ${Play[aPlay]} and b plays ${Play[bPlay]}`, () => {
    expect(calculateResult(aPlay, bPlay)).toEqual(expectedResult);
  });
}

describe('result', () => {
  testOutcome(Play.Rock, Play.Rock, Result.Tie);
  testOutcome(Play.Rock, Play.Paper, Result.BWon);
  testOutcome(Play.Rock, Play.Scissors, Result.AWon);
  testOutcome(Play.Paper, Play.Rock, Result.AWon);
  testOutcome(Play.Paper, Play.Paper, Result.Tie);
  testOutcome(Play.Paper, Play.Scissors, Result.BWon);
  testOutcome(Play.Scissors, Play.Rock, Result.BWon);
  testOutcome(Play.Scissors, Play.Paper, Result.AWon);
  testOutcome(Play.Scissors, Play.Scissors, Result.Tie);
});
