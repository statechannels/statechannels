// @ts-ignore
import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet} from 'ethers';
import {MaxUint256} from 'ethers/constants';
import {solidityKeccak256} from 'ethers/utils';
import TrivialAppArtifact from '../../../build/contracts/TrivialApp.json';
import {Channel} from '../../../src/contract/channel';
import {validTransition} from '../../../src/contract/force-move-app';
import {State} from '../../../src/contract/state';
import {VariablePart} from '../../../src/contract/state.js';
import {getTestProvider, setupContracts} from '../../test-helpers';

const provider = getTestProvider();
let trivialApp: Contract;

function computeSaltedHash(salt: string, num: number) {
  return solidityKeccak256(['bytes32', 'uint256'], [salt, num]);
}

beforeAll(async () => {
  trivialApp = await setupContracts(provider, TrivialAppArtifact);
});

describe('validTransition', () => {
  it('Random inputs always return true', async () => {
    expect.assertions(5);
    for (let i = 0; i < 5; i++) {
      const from: VariablePart = getRandomVariablePart();
      const to: VariablePart = getRandomVariablePart();
      const isValidFromCall = await trivialApp.validTransition(from, to, 0, 0);
      expect(isValidFromCall).toBe(true);
    }
  });

  it('Proper state transitions return true', async () => {
    const channel: Channel = {
      participants: [Wallet.createRandom().address, Wallet.createRandom().address],
      chainId: '0x1',
      channelNonce: '0x1',
    };
    const fromState: State = {
      channel,
      outcome: [],
      turnNum: 1,
      isFinal: false,
      challengeDuration: 0x0,
      appDefinition: trivialApp.address,
      appData: '0x0',
    };
    const toState: State = {...fromState, turnNum: 2};

    expect(
      // Passing valid transitions, as opposed to VariableParts, can properly validTransition
      await validTransition(fromState, toState, trivialApp.address, provider.getSigner(0))
    ).toBe(true);
  });
});

function getRandomVariablePart(): VariablePart {
  const randomNum = Math.floor(Math.random() * 100);
  const salt = MaxUint256.toHexString();
  const hash = computeSaltedHash(salt, randomNum);

  const variablePart: VariablePart = {
    outcome: hash,
    appData: hash,
  };
  return variablePart;
}
