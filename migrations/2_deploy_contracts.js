var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
var StartFinishGame = artifacts.require("./StartFinishGame.sol");

module.exports = function(deployer) {
  deployer.deploy(RockPaperScissors);
  deployer.deploy(StartFinishGame);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
