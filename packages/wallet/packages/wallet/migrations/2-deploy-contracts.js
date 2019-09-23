
const NitroAdjudicator = artifacts.require('NitroAdjudicator');
const ConsensusApp = artifacts.require('ConsensusApp');

module.exports = async function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(NitroAdjudicator)
    await deployer.deploy(ConsensusApp);
  });
};
