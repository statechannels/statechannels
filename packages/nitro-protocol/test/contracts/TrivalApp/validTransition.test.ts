import {Contract, Wallet, ethers, utils} from 'ethers';

import TrivialAppArtifact from '../../../artifacts/contracts/TrivialApp.sol/TrivialApp.json';
import {Channel} from '../../../src/contract/channel';
import {validTransition} from '../../../src/contract/force-move-app';
import {State, VariablePart} from '../../../src/contract/state';
import {getRandomNonce, getTestProvider, setupContract} from '../../test-helpers';

const provider = getTestProvider();
let trivialApp: Contract;

function computeSaltedHash(salt: string, num: number) {
  return utils.solidityKeccak256(['bytes32', 'uint256'], [salt, num]);
}

function getRandomVariablePart(): VariablePart {
  const randomNum = Math.floor(Math.random() * 100);
  const salt = ethers.constants.MaxUint256.toHexString();
  const hash = computeSaltedHash(salt, randomNum);

  const variablePart: VariablePart = {
    outcome: hash,
    appData: hash,
  };
  return variablePart;
}

beforeAll(async () => {
  trivialApp = setupContract(provider, TrivialAppArtifact, process.env.TRIVIAL_APP_ADDRESS);
});

describe('validTransition', () => {
  it('Transitions between random VariableParts are valid', async () => {
    expect.assertions(5);
    for (let i = 0; i < 5; i++) {
      const from: VariablePart = getRandomVariablePart();
      const to: VariablePart = getRandomVariablePart();
      const isValidFromCall = await trivialApp.validTransition(from, to, 0, 0);
      expect(isValidFromCall).toBe(true);
    }
  });

  it('Transitions between States with mocked-up data are valid', async () => {
    const channel: Channel = {
      participants: [Wallet.createRandom().address, Wallet.createRandom().address],
      chainId: process.env.CHAIN_NETWORK_ID,
      channelNonce: getRandomNonce('trivialApp'),
    };
    const fromState: State = {
      channel,
      outcome: [],
      turnNum: 1,
      isFinal: false,
      challengeDuration: 0x0,
      appDefinition: trivialApp.address,
      appData: '0x00',
    };
    const toState: State = {...fromState, turnNum: 2};

    expect(
      // Use the helper function, which accepts States instead of VariableParts
      await validTransition(fromState, toState, trivialApp)
    ).toBe(true);
  });
});
