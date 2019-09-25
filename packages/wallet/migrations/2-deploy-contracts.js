const NitroAdjudicator = artifacts.require('NitroAdjudicator');
const ConsensusApp = artifacts.require('ConsensusApp');
const ETHAssetHolder = artifacts.require('ETHAssetHolder');

module.exports = async function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(NitroAdjudicator);
    await deployer.deploy(ConsensusApp);
    const NitroAdjudicatorInstance = await NitroAdjudicator.deployed();
    await deployer.deploy(ETHAssetHolder, NitroAdjudicatorInstance.address);
  });
};
