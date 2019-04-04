var Commitment = artifacts.require("fmg-core/contracts/Commitment.sol");
var Rules = artifacts.require("fmg-core/contracts/Rules.sol");
var TestGame = artifacts.require('../contracts/TestGame.sol')
var NitroAdjudicator = artifacts.require("fmg-nitro-adjudicator/contracts/NitroAdjudicator");

module.exports = function (deployer) {
  deployer.deploy(Commitment);

  deployer.link(Commitment, Rules);
  deployer.deploy(Rules);
  // TODO: We should only deploy this when testing
  deployer.deploy(TestGame);

  deployer.link(Commitment, NitroAdjudicator);
  deployer.link(Rules, NitroAdjudicator);
  deployer.deploy(NitroAdjudicator);
};