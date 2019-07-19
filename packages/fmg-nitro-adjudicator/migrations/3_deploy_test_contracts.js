const Commitment = artifacts.require('./Commitment.sol');
const Rules = artifacts.require('Rules');
const ConsensusCommitment = artifacts.require('./ConsensusCommitment.sol');
const TestConsensusCommitment = artifacts.require('./test-contracts/TestConsensusCommitment.sol');
const testERC20 = artifacts.require('testERC20');
const NitroAdjudicator = artifacts.require('NitroAdjudicator');
const TestNitroAdjudicator = artifacts.require('TestNitroAdjudicator');
const NitroLibrary = artifacts.require('NitroLibrary2');
const CountingApp = artifacts.require('CountingApp');
const CountingCommitment = artifacts.require('CountingCommitment');

module.exports = function(deployer) {
  deployer.link(Commitment, TestConsensusCommitment);
  deployer.link(ConsensusCommitment, TestConsensusCommitment);
  deployer.deploy(TestConsensusCommitment);

  deployer.deploy(testERC20);

  deployer.link(Commitment, TestNitroAdjudicator);
  deployer.link(Rules, TestNitroAdjudicator);
  deployer.link(NitroAdjudicator, TestNitroAdjudicator);

  deployer.deploy(NitroLibrary).then(function() {
    return deployer.deploy(TestNitroAdjudicator, NitroLibrary.address);
  });

  deployer.link(Commitment, CountingApp);
  deployer.link(Rules, CountingApp);
  deployer.link(CountingCommitment, CountingApp);
  deployer.deploy(CountingApp);
};
