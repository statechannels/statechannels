import {
  decodeAppData,
  encodeAppData,
  Reveal,
  RoundProposed,
  RoundAccepted,
  Start,
} from '../app-data';
import {HashZero} from 'ethers/constants';
import {Weapon} from '../weapons';
import {bigNumberify} from 'ethers/utils';

const testStart: Start = {
  type: 'start',
  stake: '0',
};

const testReveal: Reveal = {
  type: 'reveal',
  playerAWeapon: Weapon.Paper,
  playerBWeapon: Weapon.Rock,
  salt: HashZero,
  stake: '0',
};

const testRoundProposed: RoundProposed = {
  type: 'roundProposed',
  stake: bigNumberify(99).toString(),
  preCommit: HashZero,
};

const testRoundAccepted: RoundAccepted = {
  type: 'roundAccepted',
  stake: bigNumberify(99).toString(),
  preCommit: HashZero,
  playerBWeapon: Weapon.Rock,
};

describe('app-data.ts', () => {
  test('decode is the inverse of encode', () => {
    expect(decodeAppData(encodeAppData(testStart))).toStrictEqual(testStart);
    expect(decodeAppData(encodeAppData(testRoundProposed))).toStrictEqual(testRoundProposed);
    expect(decodeAppData(encodeAppData(testRoundAccepted))).toStrictEqual(testRoundAccepted);
    expect(decodeAppData(encodeAppData(testReveal))).toStrictEqual(testReveal);
  });
});
