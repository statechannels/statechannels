const OptimizedForceMove = artifacts.require('OptimizedForceMove');
const TrivialApp = artifacts.require('TrivialApp');
const CountingApp = artifacts.require('CountingApp');

module.exports = function(deployer) {
  deployer.deploy(OptimizedForceMove);
  deployer.deploy(TrivialApp);
  deployer.deploy(CountingApp);
};
