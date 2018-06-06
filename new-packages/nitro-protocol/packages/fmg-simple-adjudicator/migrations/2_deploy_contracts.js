var State = artifacts.require("fmg-core/contracts/State.sol");
var Rules = artifacts.require("fmg-core/contracts/Rules.sol");
var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);

  deployer.link(State, SimpleAdjudicator);
  deployer.link(Rules, SimpleAdjudicator);

};
