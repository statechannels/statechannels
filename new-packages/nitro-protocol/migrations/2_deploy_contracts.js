const Token = artifacts.require('Token');
const ETHAssetHolder = artifacts.require('ETHAssetHolder');
const ERC20AssetHolder = artifacts.require('ERC20AssetHolder');
const NitroAdjudicator = artifacts.require('NitroAdjudicator');
const ConsensusApp = artifacts.require('ConsensusApp');
const POC = artifacts.require('POC');

module.exports = async function(deployer) {
  deployer.then(async () => {
    await Promise.all([deployer.deploy(NitroAdjudicator), deployer.deploy(Token)]);

    const [NitroAdjudicatorInstance, TokenInstance] = await Promise.all([
      NitroAdjudicator.deployed(),
      Token.deployed(),
    ]);

    await deployer.deploy(ETHAssetHolder, NitroAdjudicatorInstance.address);
    await deployer.deploy(
      ERC20AssetHolder,
      NitroAdjudicatorInstance.address,
      TokenInstance.address,
    );
    await deployer.deploy(ConsensusApp);

    await deployer.deploy(POC);
  });
};
