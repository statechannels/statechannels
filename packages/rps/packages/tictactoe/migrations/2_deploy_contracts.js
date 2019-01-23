var TicTacToeState = artifacts.require("TicTacToeState");
var TicTacToeHelpers = artifacts.require("TicTacToeHelpers");
var TicTacToeGame = artifacts.require("TicTacToeGame");
var State = artifacts.require("fmg-core/contracts/State.sol");
var Rules = artifacts.require("fmg-core/contracts/Rules.sol");
var SimpleAdjudicator = artifacts.require("fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, TicTacToeState);
  deployer.deploy(TicTacToeState);

  deployer.link(TicTacToeState, TicTacToeGame);
  deployer.link(State, TicTacToeGame);

  deployer.deploy(TicTacToeHelpers);
  deployer.link(TicTacToeHelpers,TicTacToeGame)
  deployer.deploy(TicTacToeGame);

  deployer.link(State, Rules);
  deployer.deploy(Rules);
  // Linking these without deploying doesn't seem to update the bytecode
  // so we probably don't have to bother doing it.
  deployer.link(State, SimpleAdjudicator);
  deployer.link(Rules, SimpleAdjudicator);
};