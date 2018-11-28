var State = artifacts.require('./State.sol');
// var Rules = artifacts.require('./Rules.sol');
var SampleState = artifacts.require('./SampleState.sol');

module.exports = function(deployer) {
  deployer.deploy(State);
  deployer.deploy(SampleState);

  // deployer.link(State, Rules);
  // deployer.deploy(Rules);
};
