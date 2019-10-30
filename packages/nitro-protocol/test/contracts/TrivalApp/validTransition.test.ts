// @ts-ignore
import {expectRevert} from '@statechannels/devtools';
import {Contract} from 'ethers';
import {MaxUint256} from 'ethers/constants';
import {solidityKeccak256} from 'ethers/utils';
import TrivialAppArtifact from '../../../build/contracts/TrivialApp.json';
import {VariablePart} from '../../../src/contract/state.js';
import {getTestProvider, setupContracts} from '../../test-helpers';

const provider = getTestProvider();
let trivialApp: Contract;

function computeRandomHash(salt: string, num: number) {
  return solidityKeccak256(['bytes32', 'uint256'], [salt, num]);
}

beforeAll(async () => {
  trivialApp = await setupContracts(provider, TrivialAppArtifact);
});

describe('validTransition', () => {
  it.each`
    randomNum                          | description
    ${Math.floor(Math.random() * 100)} | ${'True'}
  `('$description', async ({randomNum}: {randomNum: number}) => {
    const salt = MaxUint256.toHexString();
    const hash = computeRandomHash(salt, randomNum);

    const variablePart: VariablePart = {
      outcome: hash,
      appData: hash,
    };
    const isValidFromCall = await trivialApp.validTransition(variablePart, variablePart, 0, 0);
    expect(isValidFromCall).toBe(true);
  });

  it('Random inputs always equal true', async () => {
    expect.assertions(5);
    for (let i = 0; i < 5; i++) {
      const randomNum = Math.floor(Math.random() * 100);
      const salt = MaxUint256.toHexString();
      const hash = computeRandomHash(salt, randomNum);

      const variablePart: VariablePart = {
        outcome: hash,
        appData: hash,
      };
      const isValidFromCall = await trivialApp.validTransition(variablePart, variablePart, 0, 0);
      expect(isValidFromCall).toBe(true);
    }
  });
});
