var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
var RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var CountingState = artifacts.require("./CountingState.sol");
var CountingGame = artifacts.require("./CountingGame.sol");
var CommonState = artifacts.require("./CommonState.sol");

module.exports = function(deployer) {
  deployer.deploy(CommonState);
  deployer.link(CommonState, SimpleAdjudicator);
  // deployer.deploy(SimpleAdjudicator);

  deployer.link(CommonState, CountingState);
  deployer.deploy(CountingState);
  deployer.link(CountingState, CountingGame);
  deployer.link(CommonState, CountingGame);
  deployer.deploy(CountingGame);

  deployer.link(CommonState, RockPaperScissorsState);
  deployer.deploy(RockPaperScissorsState);
  deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  deployer.link(CommonState, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);

};
