const NitroAdjudicator = artifacts.require('NitroAdjudicator');
const ConsensusApp = artifacts.require('ConsensusApp');
const TrivialApp = artifacts.require('TrivialApp');
const ETHAssetHolder = artifacts.require('ETHAssetHolder');

module.exports = async function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(NitroAdjudicator);
    await deployer.deploy(ConsensusApp);
    // TODO: Should this be in the main migrations or only in tests?
    await deployer.deploy(TrivialApp);
    const NitroAdjudicatorInstance = await NitroAdjudicator.deployed();
    await deployer.deploy(ETHAssetHolder, NitroAdjudicatorInstance.address);
  });
};
