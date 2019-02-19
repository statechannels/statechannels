var Commitment = artifacts.require('./Commitment.sol');
var Rules = artifacts.require('./Rules.sol');
var CountingCommitment = artifacts.require('./CountingCommitment.sol');
var CountingApp = artifacts.require('./CountingApp.sol');
var ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
var ConsensusApp = artifacts.require('./ConsensusApp.sol');

module.exports = function(deployer) {
  deployer.deploy(Commitment);

  deployer.link(Commitment, Rules);
  deployer.deploy(Rules);

  deployer.link(Commitment, CountingCommitment);
  deployer.deploy(CountingCommitment);

  deployer.link(Commitment, CountingApp);
  deployer.link(Rules, CountingApp);
  deployer.link(CountingCommitment, CountingApp);
  deployer.deploy(CountingApp);

  deployer.link(Commitment, ConsensusCommitment);
  deployer.deploy(ConsensusCommitment);

  deployer.link(Commitment, ConsensusApp);
  deployer.link(Rules, ConsensusApp);
  deployer.link(ConsensusCommitment, ConsensusApp);
  deployer.deploy(ConsensusApp);
};
