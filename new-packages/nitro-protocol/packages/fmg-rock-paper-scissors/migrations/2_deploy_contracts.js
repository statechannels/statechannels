var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
var RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
var CommonState = artifacts.require("fmg-core/contracts/CommonState.sol");

module.exports = function(deployer) {
  deployer.deploy(CommonState);

  deployer.link(CommonState, RockPaperScissorsState);
  deployer.deploy(RockPaperScissorsState);
  deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  deployer.link(CommonState, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);
};
