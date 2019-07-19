const Commitment = artifacts.require('./Commitment.sol');
const Rules = artifacts.require('Rules');
const ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
const TestConsensusCommitment = artifacts.require('./test-contracts/TestConsensusCommitment.sol');
const testERC20 = artifacts.require('testERC20');
const NitroVault = artifacts.require('NitroVault');
const TestNitroVault = artifacts.require('TestNitroVault');
const NitroLibrary = artifacts.require('NitroLibrary2');
const CountingApp = artifacts.require('CountingApp');
const CountingCommitment = artifacts.require('CountingCommitment');

module.exports = function(deployer) {
  deployer.link(Commitment, TestConsensusCommitment);
  deployer.link(ConsensusCommitment, TestConsensusCommitment);
  deployer.deploy(TestConsensusCommitment);

  deployer.deploy(testERC20);

  deployer.link(Commitment, TestNitroVault);
  deployer.link(Rules, TestNitroVault);
  deployer.link(NitroVault, TestNitroVault);

  deployer.deploy(NitroLibrary).then(function() {
    return deployer.deploy(TestNitroVault, NitroLibrary.address);
  });

  deployer.link(Commitment, CountingApp);
  deployer.link(Rules, CountingApp);
  deployer.link(CountingCommitment, CountingApp);
  deployer.deploy(CountingApp);
};
