const ForceMove = artifacts.require('ForceMove');
const TrivialApp = artifacts.require('TrivialApp');
const CountingApp = artifacts.require('CountingApp');
const Token = artifacts.require('Token');
const ETHAssetHolder = artifacts.require('ETHAssetHolder');
const ERC20AssetHolder = artifacts.require('ERC20AssetHolder');

module.exports = async function(deployer) {
  deployer.then(async () => {
    await Promise.all([deployer.deploy(ForceMove), deployer.deploy(Token)]);

    const [ForceMoveInstance, TokenInstance] = await Promise.all([
      ForceMove.deployed(),
      Token.deployed(),
    ]);

    await deployer.deploy(ETHAssetHolder, ForceMoveInstance.address);
    await deployer.deploy(ERC20AssetHolder, ForceMoveInstance.address, TokenInstance.address);
    await deployer.deploy(TrivialApp);
    await deployer.deploy(CountingApp);
  });
};
