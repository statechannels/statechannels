var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
var RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
var State = artifacts.require("fmg-core/contracts/State.sol");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, RockPaperScissorsState);
  deployer.deploy(RockPaperScissorsState);
  deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  deployer.link(State, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);
};
