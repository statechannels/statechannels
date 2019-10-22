var Commitment = artifacts.require('fmg-core/contracts/Commitment.sol');
var Rules = artifacts.require('fmg-core/contracts/Rules.sol');

var NitroAdjudicator = artifacts.require(
  'fmg-nitro-adjudicator/contracts/NitroAdjudicator.sol',
);

var ConsensusCommitment = artifacts.require(
  'fmg-nitro-adjudicator/contracts/ConsensusCommitment.sol',
);
var ConsensusApp = artifacts.require(
  'fmg-nitro-adjudicator/contracts/ConsensusApp.sol',
);

module.exports = function(deployer) {
  deployer.deploy(Commitment);

  deployer.link(Commitment, Rules);
  deployer.deploy(Rules);

  deployer.link(Commitment, NitroAdjudicator);
  deployer.link(Rules, NitroAdjudicator);
  deployer.deploy(NitroAdjudicator);

  deployer.link(Commitment, ConsensusCommitment);
  deployer.deploy(ConsensusCommitment);

  deployer.link(Commitment, ConsensusApp);
  deployer.link(Rules, ConsensusApp);
  deployer.link(ConsensusCommitment, ConsensusApp);
  deployer.deploy(ConsensusApp);
};
