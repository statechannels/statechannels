var State = artifacts.require('./State.sol');
var Rules = artifacts.require('./Rules.sol');
var CountingState = artifacts.require('./CountingState.sol');
var CountingGame = artifacts.require('./CountingGame.sol');

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);

  deployer.link(State, CountingState);
  deployer.deploy(CountingState);

  deployer.link(State, CountingGame);
  deployer.link(Rules, CountingGame);
  deployer.link(CountingState, CountingGame);
  deployer.deploy(CountingGame);
};
