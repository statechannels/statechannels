const ForceMove = artifacts.require('TESTForceMove');
const AssetHolder = artifacts.require('TESTAssetHolder');
const TrivialApp = artifacts.require('TrivialApp');
const CountingApp = artifacts.require('CountingApp');

module.exports = function(deployer) {
  deployer.deploy(ForceMove);
  deployer.deploy(AssetHolder);
  deployer.deploy(TrivialApp);
  deployer.deploy(CountingApp);
};
