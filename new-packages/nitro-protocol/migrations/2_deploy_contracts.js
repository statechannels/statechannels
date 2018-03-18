var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
var RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
// var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var IncrementationState = artifacts.require("./IncrementationState.sol");
var IncrementationGame = artifacts.require("./IncrementationGame.sol");
var CommonState = artifacts.require("./CommonState.sol");

module.exports = function(deployer) {
  // deployer.deploy(SimpleAdjudicator);
  deployer.deploy(CommonState);

  deployer.link(CommonState, IncrementationState);
  deployer.deploy(IncrementationState);
  deployer.link(IncrementationState, IncrementationGame);
  deployer.link(CommonState, IncrementationGame);
  deployer.deploy(IncrementationGame);

  deployer.link(CommonState, RockPaperScissorsState);
  deployer.deploy(RockPaperScissorsState);
  deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  deployer.link(CommonState, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);

};
