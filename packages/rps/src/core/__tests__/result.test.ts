import { Player } from '../players';
import { Weapon } from '../weapons';
import {
  Result,
  calculateResult,
  calculateAbsoluteResult,
  convertToAbsoluteResult,
  convertToRelativeResult,
} from '../results';

function testOutcome(yourWeapon: Weapon, theirWeapon: Weapon, expectedResult: Result) {
  describe(`When you play ${Weapon[yourWeapon]} and they play ${Weapon[theirWeapon]}`, () => {
    const relativeResultFromWeapons = calculateResult(yourWeapon, theirWeapon);

    it(`result gives ${Result[expectedResult]}`, () => {
      expect(relativeResultFromWeapons).toEqual(expectedResult);
    });

    describe('when you are player A', () => {
      const absoluteResultFromWeapons = calculateAbsoluteResult(yourWeapon, theirWeapon);

      const relativeResultFromAbsolute = convertToRelativeResult(
        absoluteResultFromWeapons,
        Player.PlayerA
      );
      const absoluteResultFromRelative = convertToAbsoluteResult(
        relativeResultFromWeapons,
        Player.PlayerA
      );

      it('relativeResult is consistent with calculateAbsoluteResult', () => {
        expect(relativeResultFromWeapons).toEqual(relativeResultFromAbsolute);
      });

      it('absoluteResult is consistent with calculateResult', () => {
        expect(absoluteResultFromRelative).toEqual(absoluteResultFromWeapons);
      });
    });

    describe('when you are player A', () => {
      const absoluteResultFromWeapons = calculateAbsoluteResult(theirWeapon, yourWeapon);

      const relativeResultFromAbsolute = convertToRelativeResult(
        absoluteResultFromWeapons,
        Player.PlayerB
      );
      const absoluteResultFromRelative = convertToAbsoluteResult(
        relativeResultFromWeapons,
        Player.PlayerB
      );

      it('relativeResult is consistent with calculateAbsoluteResult', () => {
        expect(relativeResultFromWeapons).toEqual(relativeResultFromAbsolute);
      });

      it('absoluteResult is consistent with calculateResult', () => {
        expect(absoluteResultFromRelative).toEqual(absoluteResultFromWeapons);
      });
    });
  });
}

describe('result', () => {
  testOutcome(Weapon.Rock, Weapon.Rock, Result.Tie);
  testOutcome(Weapon.Rock, Weapon.Paper, Result.YouLose);
  testOutcome(Weapon.Rock, Weapon.Scissors, Result.YouWin);
  testOutcome(Weapon.Paper, Weapon.Rock, Result.YouWin);
  testOutcome(Weapon.Paper, Weapon.Paper, Result.Tie);
  testOutcome(Weapon.Paper, Weapon.Scissors, Result.YouLose);
  testOutcome(Weapon.Scissors, Weapon.Rock, Result.YouLose);
  testOutcome(Weapon.Scissors, Weapon.Paper, Result.YouWin);
  testOutcome(Weapon.Scissors, Weapon.Scissors, Result.Tie);
});
