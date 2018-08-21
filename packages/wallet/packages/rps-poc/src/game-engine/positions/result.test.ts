import { Play, Result, calculateResult } from '.';

function testOutcome(yourPlay: Play, theirPlay: Play, expectedResult: Result) {
  it(`Gives ${Result[expectedResult]} when you play ${Play[yourPlay]} and they play ${Play[theirPlay]}`, () => {
    expect(calculateResult(yourPlay, theirPlay)).toEqual(expectedResult);
  });
}

describe('result', () => {
  testOutcome(Play.Rock, Play.Rock, Result.Tie);
  testOutcome(Play.Rock, Play.Paper, Result.YouLose);
  testOutcome(Play.Rock, Play.Scissors, Result.YouWin);
  testOutcome(Play.Paper, Play.Rock, Result.YouWin);
  testOutcome(Play.Paper, Play.Paper, Result.Tie);
  testOutcome(Play.Paper, Play.Scissors, Result.YouLose);
  testOutcome(Play.Scissors, Play.Rock, Result.YouLose);
  testOutcome(Play.Scissors, Play.Paper, Result.YouWin);
  testOutcome(Play.Scissors, Play.Scissors, Result.Tie);
});
