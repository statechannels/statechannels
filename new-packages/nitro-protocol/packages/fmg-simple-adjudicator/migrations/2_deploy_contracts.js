var CommonState = artifacts.require("fmg-core/contracts/CommonState.sol");
var Framework = artifacts.require("fmg-core/contracts/Framework.sol");
var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");

module.exports = function(deployer) {
  deployer.deploy(CommonState);

  deployer.link(CommonState, Framework);
  deployer.deploy(Framework);

  deployer.link(CommonState, SimpleAdjudicator);
  deployer.link(Framework, SimpleAdjudicator);

};
