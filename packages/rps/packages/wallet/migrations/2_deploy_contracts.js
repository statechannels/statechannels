var State = artifacts.require("fmg-core/contracts/State.sol");
var Rules = artifacts.require("fmg-core/contracts/Rules.sol");
var TestGame = artifacts.require('../contracts/TestGame.sol')
var SimpleAdjudicator = artifacts.require("fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol");

module.exports = function (deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);
  // TODO: We should only deploy this when testing
  deployer.deploy(TestGame);
  // Linking these without deploying doesn't seem to update the bytecode
  // so we probably don't have to bother doing it.
  deployer.link(State, SimpleAdjudicator);
  deployer.link(Rules, SimpleAdjudicator);
};