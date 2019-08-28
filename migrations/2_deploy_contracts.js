const ForceMove = artifacts.require('ForceMove');
const TrivialApp = artifacts.require('TrivialApp');
const CountingApp = artifacts.require('CountingApp');
const AssetHolder = artifacts.require('AssetHolder');

module.exports = function(deployer) {
  deployer.deploy(ForceMove);
  deployer.deploy(TrivialApp);
  deployer.deploy(CountingApp);
  deployer.deploy(AssetHolder);
};
