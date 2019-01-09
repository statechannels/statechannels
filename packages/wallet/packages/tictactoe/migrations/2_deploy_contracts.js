var State = artifacts.require("fmg-core/contracts/State.sol");
var TicTacToeState = artifacts.require("TicTacToeState");
var TicTacToeHelpers = artifacts.require("TicTacToeHelpers");
var TicTacToeGame = artifacts.require("TicTacToeGame");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, TicTacToeState);
  deployer.deploy(TicTacToeState);

  deployer.link(TicTacToeState, TicTacToeGame);
  deployer.link(State, TicTacToeGame);

  deployer.deploy(TicTacToeHelpers);
  deployer.link(TicTacToeHelpers,TicTacToeGame)
  deployer.deploy(TicTacToeGame);
};