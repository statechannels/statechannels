var RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
var RockPaperScissorsCommitment = artifacts.require("./RockPaperScissorsCommitment.sol");
var Commitment = artifacts.require("fmg-core/contracts/Commitment.sol");

module.exports = function (deployer) {
  deployer.deploy(Commitment);
  deployer.link(Commitment, RockPaperScissorsCommitment);
  deployer.deploy(RockPaperScissorsCommitment);
  deployer.link(RockPaperScissorsCommitment, RockPaperScissorsGame);
  deployer.link(Commitment, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);

};