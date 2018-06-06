// var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
// var RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
// var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
// var CountingState = artifacts.require("./CountingState.sol");
// var CountingGame = artifacts.require("./CountingGame.sol");
var State = artifacts.require("./State.sol");
var Rules = artifacts.require("./Rules.sol");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);

  // deployer.link(State, SimpleAdjudicator);
  // deployer.link(Rules, SimpleAdjudicator);
  // deployer.deploy(SimpleAdjudicator);

  // deployer.link(State, CountingState);
  // deployer.deploy(CountingState);
  // deployer.link(CountingState, CountingGame);
  // deployer.link(State, CountingGame);
  // deployer.deploy(CountingGame);

  // deployer.link(State, RockPaperScissorsState);
  // deployer.deploy(RockPaperScissorsState);
  // deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  // deployer.link(State, RockPaperScissorsGame);
  // deployer.deploy(RockPaperScissorsGame);

};
