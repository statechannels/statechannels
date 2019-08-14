const OptimizedForceMove = artifacts.require('OptimizedForceMove');
const TrivialApp = artifacts.require('TrivialApp');

module.exports = function(deployer) {
  deployer.deploy(OptimizedForceMove);
  deployer.deploy(TrivialApp);
};
