var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
var StartFinishGame = artifacts.require("./StartFinishGame.sol");
var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var IncrementationGame = artifacts.require("./IncrementationGame.sol");

module.exports = function(deployer) {
  deployer.deploy(RockPaperScissors);
  deployer.deploy(StartFinishGame);
  deployer.deploy(SimpleAdjudicator);
  deployer.deploy(IncrementationGame);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
