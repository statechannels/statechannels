var State = artifacts.require('./State.sol');
var Rules = artifacts.require('./Rules.sol');

var CountingState = artifacts.require('./test-game/CountingState.sol');
var CountingGame = artifacts.require('./test-game/CountingGame.sol');

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);

  deployer.link(State, CountingState);
  deployer.deploy(CountingState);

  deployer.link(State, CountingGame);
  deployer.link(CountingState, CountingGame);
  deployer.link(Rules, CountingGame);
  deployer.deploy(CountingGame);
};
