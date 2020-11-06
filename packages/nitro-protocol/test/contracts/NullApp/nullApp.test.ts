import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, ethers} from 'ethers';

import {getRandomNonce, getTestProvider, setupContracts} from '../../test-helpers';
import NitroAdjudicatorArtifact from '../../../build/contracts/TESTNitroAdjudicator.json';
import {getVariablePart, State, Channel} from '../../../src';

const provider = getTestProvider();

let NitroAdjudicator: Contract;
beforeAll(async () => {
  NitroAdjudicator = await setupContracts(
    provider,
    NitroAdjudicatorArtifact,
    process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
  );
});

describe('null app', () => {
  // eslint-disable-next-line jest/expect-expect
  it('should revert when validTransition is called', async () => {
    const channel: Channel = {
      participants: [Wallet.createRandom().address, Wallet.createRandom().address],
      chainId: '0x1',
      channelNonce: getRandomNonce('nullApp'),
    };
    const fromState: State = {
      channel,
      outcome: [],
      turnNum: 1,
      isFinal: false,
      challengeDuration: 0x0,
      appDefinition: ethers.constants.AddressZero,
      appData: '0x00',
    };
    const toState: State = {...fromState, turnNum: 2};

    expectRevert(async () => {
      await NitroAdjudicator.validTransition(
        1,
        [false, false],
        [getVariablePart(fromState), getVariablePart(toState)],
        5,
        ethers.constants.AddressZero
      );
    }, 'VM Exception while processing transaction: revert');
  });
});
