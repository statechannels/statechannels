var Commitment = artifacts.require('./Commitment.sol');
var Rules = artifacts.require('./Rules.sol');
var ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
var ConsensusApp = artifacts.require('./ConsensusApp.sol');
var TestConsensusCommitment = artifacts.require('./test-contracts/TestConsensusCommitment.sol');
var TestConsensusApp = artifacts.require('./test-contracts/TestConsensusApp.sol');

module.exports = function(deployer) {
  deployer.link(Commitment, TestConsensusCommitment);
  deployer.link(ConsensusCommitment, TestConsensusCommitment);
  deployer.deploy(TestConsensusCommitment);

  deployer.link(Commitment, TestConsensusApp);
  deployer.link(Rules, TestConsensusApp);
  deployer.link(ConsensusCommitment, TestConsensusApp);
  deployer.link(ConsensusApp, TestConsensusApp);
  deployer.deploy(TestConsensusApp);
};
