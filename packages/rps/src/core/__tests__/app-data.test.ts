import {bigNumberify} from 'ethers/utils';
import {randomHex} from '../../utils/randomHex';
import {decodeAppData, encodeAppData, RPSData, PositionType, Reveal, toRPSData} from '../app-data';
import {HashZero} from 'ethers/constants';
import {Weapon} from '../weapons';

const testAppData: RPSData = {
  positionType: PositionType.RoundProposed,
  stake: bigNumberify(2),
  preCommit: HashZero,
  playerAWeapon: Weapon.Paper,
  playerBWeapon: Weapon.Rock,
  salt: randomHex(64),
};

const testReveal: Reveal = {
  type: 'reveal',
  playerAWeapon: Weapon.Paper,
  playerBWeapon: Weapon.Rock,
};

const testRevealWithDefaults: RPSData = {
  playerAWeapon: Weapon.Paper,
  playerBWeapon: Weapon.Rock,
  positionType: PositionType.Start,
  stake: bigNumberify(0),
  preCommit: HashZero,
  salt: randomHex(64),
};

describe('app-data.ts', () => {
  test('decode is the inverse of encode', () => {
    expect(decodeAppData(encodeAppData(testAppData))).toStrictEqual(testAppData);
  });
  test('can encode a Reveal by padding with defaults', () => {
    expect(decodeAppData(encodeAppData(toRPSData(testReveal)))).toStrictEqual(
      testRevealWithDefaults
    );
  });
});
