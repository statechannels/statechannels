import {bigNumberify} from 'ethers/utils';
import {randomHex} from '../../utils/randomHex';
import {decodeAppData, encodeAppData, RPSData, PositionType} from '../app-data';
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

test('decode is the inverse of encode', () => {
  expect(decodeAppData(encodeAppData(testAppData))).toStrictEqual(testAppData);
});
