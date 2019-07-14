const Commitment = artifacts.require('./Commitment.sol');
const Rules = artifacts.require('Rules');
const ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
const TestConsensusCommitment = artifacts.require('./test-contracts/TestConsensusCommitment.sol');
const testERC20 = artifacts.require('testERC20');
const NitroVault = artifacts.require('NitroVault');
const NitroAdjudicator = artifacts.require('NitroAdjudicator');
const TestNitroAdjudicator = artifacts.require('TestNitroAdjudicator');
const TestNitroVault = artifacts.require('TestNitroVault');

module.exports = function(deployer) {
  deployer.link(Commitment, TestConsensusCommitment);
  deployer.link(ConsensusCommitment, TestConsensusCommitment);
  deployer.deploy(TestConsensusCommitment);

  deployer.deploy(testERC20);

  deployer.link(Commitment, TestNitroAdjudicator);
  deployer.link(Rules, TestNitroAdjudicator);
  deployer.link(NitroAdjudicator, TestNitroAdjudicator);
  deployer.deploy(TestNitroAdjudicator);

  deployer.link(NitroVault, TestNitroVault);
  deployer.deploy(TestNitroVault);
};
