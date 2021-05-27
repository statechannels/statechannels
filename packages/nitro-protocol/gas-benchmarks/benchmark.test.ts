import {channelId} from './fixtures';
import {gasRequiredTo} from './gas';
import {erc20AssetHolder, ethAssetHolder, nitroAdjudicator} from './vanillaSetup';

describe('Consumes the expected gas', () => {
  it(`when deploying the NitroAdjudicator >>>>>  ${gasRequiredTo.deployInfrastructureContracts.vanillaNitro.NitroAdjudicator} gas`, async () => {
    const {gasUsed} = await nitroAdjudicator.deployTransaction.wait();
    expect(gasUsed.toNumber()).toEqual(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.NitroAdjudicator
    );
  });
  it(`when deploying the ETHAssetHolder >>>>>  ${gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ETHAssetHolder} gas`, async () => {
    const {gasUsed} = await ethAssetHolder.deployTransaction.wait();
    expect(gasUsed.toNumber()).toEqual(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ETHAssetHolder
    );
  });
  it(`when deploying the ERC20AssetHolder >>>>>  ${gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ERC20AssetHolder} gas`, async () => {
    const {gasUsed} = await erc20AssetHolder.deployTransaction.wait();
    expect(gasUsed.toNumber()).toEqual(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ERC20AssetHolder
    );
  });
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
