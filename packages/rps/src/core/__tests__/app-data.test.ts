import { decodeAppData, encodeAppData, Reveal, RoundProposed } from '../app-data';
import { HashZero } from 'ethers/constants';
import { Weapon } from '../weapons';
import { bigNumberify } from 'ethers/utils';

const testReveal: Reveal = {
  type: 'reveal',
  playerAWeapon: Weapon.Paper,
  playerBWeapon: Weapon.Rock,
  salt: HashZero,
};

const testRoundProposed: RoundProposed = {
  type: 'roundProposed',
  stake: bigNumberify(99),
  preCommit: HashZero,
};

describe('app-data.ts', () => {
  test('decode is the inverse of encode', () => {
    expect(decodeAppData(encodeAppData(testRoundProposed))).toStrictEqual(testRoundProposed);
    expect(decodeAppData(encodeAppData(testReveal))).toStrictEqual(testReveal);
  });
});
