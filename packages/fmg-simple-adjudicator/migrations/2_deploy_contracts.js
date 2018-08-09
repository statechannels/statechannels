var State = artifacts.require("fmg-core/contracts/State.sol");
var Rules = artifacts.require("fmg-core/contracts/Rules.sol");
var CountingState = artifacts.require("fmg-core/contracts/test/CountingState.sol");
var CountingGame = artifacts.require("fmg-core/contracts/test/CountingGame.sol");
var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);

  deployer.link(State, SimpleAdjudicator);
  deployer.link(Rules, SimpleAdjudicator);

  deployer.link(State, CountingState);
  deployer.deploy(CountingState);

  deployer.link(CountingState, CountingGame);
  deployer.link(State, CountingGame);
  deployer.deploy(CountingGame);
};
