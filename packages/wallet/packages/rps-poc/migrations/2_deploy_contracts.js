var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
var RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
var State = artifacts.require("fmg-core/contracts/State.sol");
var Rules = artifacts.require("fmg-core/contracts/Rules.sol");
var SimpleAdjudicator = artifacts.require("fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol");

module.exports = function (deployer) {
  deployer.deploy(State);

  deployer.link(State, RockPaperScissorsState);
  deployer.deploy(RockPaperScissorsState);
  deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  deployer.link(State, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);

  deployer.link(State, Rules);
  deployer.deploy(Rules);
  // Linking these without deploying doesn't seem to update the bytecode
  // so we probably don't have to bother doing it.
  deployer.link(State, SimpleAdjudicator);
  deployer.link(Rules, SimpleAdjudicator);
};
