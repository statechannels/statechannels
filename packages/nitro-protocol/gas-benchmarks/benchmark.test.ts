import {channelId} from './fixtures';
import {gasRequiredTo} from './gas';
import {ethAssetHolder} from './vanillaSetup';

describe('Consumes the expected gas', () => {
  it(`when directly funding a channel with ETH (first deposit) >>>>>  ${gasRequiredTo.directlyFundAChannelWithETHFirst.vanillaNitro} gas`, async () => {
    const tx = ethAssetHolder.deposit(channelId, 0, 5, {value: 5});
    const {gasUsed} = await (await tx).wait();
    expect(gasUsed.toNumber()).toEqual(gasRequiredTo.directlyFundAChannelWithETHFirst.vanillaNitro);
  });
  it(`when directly funding a channel with ETH (second deposit) >>>>> ${gasRequiredTo.directlyFundAChannelWithETHSecond.vanillaNitro} gas`, async () => {
    // begin setup
    const setupTX = ethAssetHolder.deposit(channelId, 0, 5, {value: 5});
    await (await setupTX).wait();
    // end setup
    const tx = ethAssetHolder.deposit(channelId, 5, 5, {value: 5});
    const {gasUsed} = await (await tx).wait();
    expect(gasUsed.toNumber()).toEqual(
      gasRequiredTo.directlyFundAChannelWithETHSecond.vanillaNitro
    );
  });
});
