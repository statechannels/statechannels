import {channelId, finalizationProof, finalState, someOtherChannelId} from './fixtures';
import {gasRequiredTo} from './gas';
import {erc20AssetHolder, ethAssetHolder, nitroAdjudicator, token} from './vanillaSetup';

describe('Consumes the expected gas for deployments', () => {
  it(`when deploying the NitroAdjudicator`, async () => {
    await expect(await nitroAdjudicator.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.NitroAdjudicator
    );
  });
  it(`when deploying the ETHAssetHolder`, async () => {
    await expect(await ethAssetHolder.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ETHAssetHolder
    );
  });
  it(`when deploying the ERC20AssetHolder`, async () => {
    await expect(await erc20AssetHolder.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ERC20AssetHolder
    );
  });
});
describe('Consumes the expected gas for deposits', () => {
  it(`when directly funding a channel with ETH (first deposit)`, async () => {
    await expect(await ethAssetHolder.deposit(channelId, 0, 5, {value: 5})).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithETHFirst.vanillaNitro
    );
  });
  it(`when directly funding a channel with ETH (second deposit)`, async () => {
    // begin setup
    const setupTX = ethAssetHolder.deposit(channelId, 0, 5, {value: 5});
    await (await setupTX).wait();
    // end setup
    await expect(await ethAssetHolder.deposit(channelId, 5, 5, {value: 5})).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithETHSecond.vanillaNitro
    );
  });
  it(`when directly funding a channel with an ERC20 (first deposit)`, async () => {
    // begin setup
    await (await token.transfer(erc20AssetHolder.address, 1)).wait(); // The asset holder already has some tokens (for other channels)
    // end setup
    await expect(await token.increaseAllowance(erc20AssetHolder.address, 100)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20First.vanillaNitro.approve
    );
    await expect(await erc20AssetHolder.deposit(channelId, 0, 5)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20First.vanillaNitro.deposit
    );
  });
  it(`when directly funding a channel with an ERC20 (second deposit)`, async () => {
    // begin setup
    await (await token.increaseAllowance(erc20AssetHolder.address, 100)).wait();
    await (await erc20AssetHolder.deposit(channelId, 0, 5)).wait(); // The asset holder already has some tokens *for this channel*
    await (await token.decreaseAllowance(erc20AssetHolder.address, 95)).wait(); // reset allowance to zero
    // end setup
    await expect(await token.increaseAllowance(erc20AssetHolder.address, 100)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20Second.vanillaNitro.approve
    );
    await expect(await erc20AssetHolder.deposit(channelId, 5, 5)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20Second.vanillaNitro.deposit
    );
  });
});
describe('Consumes the expected gas for happy-path exits', () => {
  it(`when exiting a directly funded (with ETH) channel`, async () => {
    // begin setup
    await (await ethAssetHolder.deposit(someOtherChannelId, 0, 10, {value: 10})).wait(); // other channels are funded by this asset holder
    await (await ethAssetHolder.deposit(channelId, 0, 10, {value: 10})).wait();
    // end setup
    const fP = finalizationProof(finalState(ethAssetHolder.address));
    await expect(
      await nitroAdjudicator.concludePushOutcomeAndTransferAll(
        fP.largestTurnNum,
        fP.fixedPart,
        fP.appPartHash,
        fP.outcomeBytes,
        fP.numStates,
        fP.whoSignedWhat,
        fP.sigs
      )
    ).toConsumeGas(gasRequiredTo.ETHexit.vanillaNitro);
  });
  it(`when exiting a directly funded (with ERC20s) channel`, async () => {
    // begin setup
    await (await token.increaseAllowance(erc20AssetHolder.address, 100)).wait();
    await (await erc20AssetHolder.deposit(someOtherChannelId, 0, 10)).wait(); // other channels are funded by this asset holder
    await (await erc20AssetHolder.deposit(channelId, 0, 10)).wait();
    // end setup
    const fP = finalizationProof(finalState(erc20AssetHolder.address));
    await expect(
      await nitroAdjudicator.concludePushOutcomeAndTransferAll(
        fP.largestTurnNum,
        fP.fixedPart,
        fP.appPartHash,
        fP.outcomeBytes,
        fP.numStates,
        fP.whoSignedWhat,
        fP.sigs
      )
    ).toConsumeGas(gasRequiredTo.ERC20exit.vanillaNitro);
  });
});
