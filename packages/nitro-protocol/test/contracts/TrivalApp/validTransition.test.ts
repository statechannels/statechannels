// @ts-ignore
import {expectRevert} from '@statechannels/devtools';
import {Contract} from 'ethers';
import {HashZero} from 'ethers/constants';
import TrivialAppArtifact from '../../../build/contracts/TrivialApp.json';
import {VariablePart} from '../../../src/contract/state.js';
import {getTestProvider, setupContracts} from '../../test-helpers';

const provider = getTestProvider();
let trivialApp: Contract;

beforeAll(async () => {
  trivialApp = await setupContracts(provider, TrivialAppArtifact);
});

describe('validTransition', () => {
  it.each`
    isValid  | description
    ${true}  | ${'IsValid True = True'}
    ${false} | ${'IsValid False = True'}
  `('$description', async ({isValid}: {isValid: boolean}) => {
    const variablePart: VariablePart = {
      outcome: HashZero,
      appData: HashZero,
    };
    const isValidFromCall = await trivialApp.validTransition(variablePart, variablePart, 0, 0);
    if (isValid) {
      expect(isValidFromCall).toBe(true);
    } else {
      expect(isValidFromCall).toBe(true);
    }
  });
});
