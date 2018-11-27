var State = artifacts.require('./State.sol');
var Rules = artifacts.require('./Rules.sol');

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);
};
