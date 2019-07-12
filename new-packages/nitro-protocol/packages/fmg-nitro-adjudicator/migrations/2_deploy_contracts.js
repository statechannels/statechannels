var Commitment = artifacts.require('Commitment');
var Rules = artifacts.require('Rules');
var CountingCommitment = artifacts.require('CountingCommitment');
var CountingApp = artifacts.require('CountingApp');
var ConsensusCommitment = artifacts.require('ConsensusCommitment');
var ConsensusApp = artifacts.require('ConsensusApp');
var NitroVault = artifacts.require('NitroVault');

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

  deployer.link(Commitment, NitroVault);
  deployer.link(Rules, NitroVault);
  deployer.deploy(NitroVault);
};
