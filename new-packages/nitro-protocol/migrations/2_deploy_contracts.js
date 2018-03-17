// var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
var StartFinishGame = artifacts.require("./StartFinishGame.sol");
// var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var IncrementationState = artifacts.require("./IncrementationState.sol");
var IncrementationGame = artifacts.require("./IncrementationGame.sol");
var CommonState = artifacts.require("./CommonState.sol");

module.exports = function(deployer) {
  // deployer.deploy(RockPaperScissors);
  deployer.deploy(StartFinishGame);
  // deployer.deploy(SimpleAdjudicator);
  deployer.deploy(CommonState);
  deployer.link(CommonState, IncrementationState);
  deployer.deploy(IncrementationState);
  deployer.link(IncrementationState, IncrementationGame);
  deployer.link(CommonState, IncrementationGame);
  deployer.deploy(IncrementationGame);
  // deployer.deploy(MetaCoin);
};
