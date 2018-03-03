var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
var StartFinishGame = artifacts.require("./StartFinishGame.sol");
var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");

module.exports = function(deployer) {
  deployer.deploy(RockPaperScissors);
  deployer.deploy(StartFinishGame);
  deployer.deploy(SimpleAdjudicator);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
