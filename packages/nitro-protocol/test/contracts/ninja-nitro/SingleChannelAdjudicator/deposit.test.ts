import {Contract, BigNumber} from 'ethers';
import AdjudicatorFactoryArtifact from '../../../../artifacts/contracts/ninja-nitro/AdjudicatorFactory.sol/AdjudicatorFactory.json';

import {
  getTestProvider,
  randomChannelId,
  setupContracts,
  writeGasConsumption,
} from '../../../test-helpers';

const provider = getTestProvider();
let AdjudicatorFactory: Contract;

beforeAll(async () => {
  AdjudicatorFactory = await setupContracts(
    provider,
    AdjudicatorFactoryArtifact,
    process.env.ADJUDICATOR_FACTORY_ADDRESS
  );
});

describe('deposit ETH', () => {
  it('before contract deployed', async () => {
    const channelId = randomChannelId();
    const channelAddress = await AdjudicatorFactory.getChannelAddress(channelId);
    const {gasUsed} = await (
      await provider.getSigner().sendTransaction({
        to: channelAddress,
        value: 5,
      })
    ).wait();
    await writeGasConsumption(
      'SingleChannelAdjudicator.deposit.gas.md',
      'ninja deposit (before contract deployed)',
      gasUsed
    );

    expect((await provider.getBalance(channelAddress)).eq(BigNumber.from(5))).toBe(true);
  });
  it('after contract deployed', async () => {
    const channelId = randomChannelId();
    const channelAddress = await AdjudicatorFactory.getChannelAddress(channelId);
    await (await AdjudicatorFactory.createChannel(channelId)).wait();
    const {gasUsed} = await (
      await provider.getSigner().sendTransaction({
        to: channelAddress,
        value: 5,
      })
    ).wait();
    await writeGasConsumption(
      'SingleChannelAdjudicator.deposit.gas.md',
      'ninja deposit (before contract deployed)',
      gasUsed
    );

    expect((await provider.getBalance(channelAddress)).eq(BigNumber.from(5))).toBe(true);
  });
});
// TODO:
// describe('deposit ERC20 Tokens', () => {
//   it('before contract deployed', () => {});
//   it('after contract deployed', () => {});
// });
