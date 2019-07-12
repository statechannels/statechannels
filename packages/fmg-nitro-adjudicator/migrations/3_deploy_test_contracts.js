var Commitment = artifacts.require('./Commitment.sol');
var ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
var TestConsensusCommitment = artifacts.require('./test-contracts/TestConsensusCommitment.sol');
var testERC20 = artifacts.require('testERC20');
var NitroVault = artifacts.require('NitroVault');
var TestNitroVault = artifacts.require('TestNitroVault');

module.exports = function(deployer) {
  deployer.link(Commitment, TestConsensusCommitment);
  deployer.link(ConsensusCommitment, TestConsensusCommitment);
  deployer.deploy(TestConsensusCommitment);

  deployer.deploy(testERC20);

  deployer.link(NitroVault, TestNitroVault);
  deployer.deploy(TestNitroVault);
};
