import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, BigNumber} from 'ethers';
import {AddressZero, HashZero} from '@ethersproject/constants';
import {getTestProvider, setupContracts} from '../../test-helpers';
//@ts-ignore
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
      chainId: BigNumber.from(0).toHexString(),
      channelNonce: BigNumber.from(0).toHexString(),
    };
    const fromState: State = {
      channel,
      outcome: [],
      turnNum: 1,
      isFinal: false,
      challengeDuration: 0x00,
      appDefinition: AddressZero,
      appData: HashZero,
    };
    const toState: State = {...fromState, turnNum: 2};

    expectRevert(async () => {
      await NitroAdjudicator.validTransition(
        1,
        [false, false],
        [getVariablePart(fromState), getVariablePart(toState)],
        5,
        AddressZero
      );
    }, 'VM Exception while processing transaction: revert');
  });
});
