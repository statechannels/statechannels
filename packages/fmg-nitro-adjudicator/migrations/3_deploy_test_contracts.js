var Commitment = artifacts.require('./Commitment.sol');
var ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
var TestConsensusCommitment = artifacts.require('./test-contracts/TestConsensusCommitment.sol');

module.exports = function (deployer) {

  deployer.link(Commitment, TestConsensusCommitment);
  deployer.link(ConsensusCommitment, TestConsensusCommitment);
  deployer.deploy(TestConsensusCommitment);

};