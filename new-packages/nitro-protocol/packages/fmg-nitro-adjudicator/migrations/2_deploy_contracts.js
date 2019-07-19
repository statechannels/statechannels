const Commitment = artifacts.require('Commitment');
const Rules = artifacts.require('Rules');
const CountingCommitment = artifacts.require('CountingCommitment');
const CountingApp = artifacts.require('CountingApp');
const ConsensusCommitment = artifacts.require('ConsensusCommitment');
const ConsensusApp = artifacts.require('ConsensusApp');
const NitroLibrary = artifacts.require('NitroLibrary');
const NitroAdjudicator = artifacts.require('NitroAdjudicator');

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

  deployer.link(Commitment, NitroLibrary);
  deployer.link(Rules, NitroLibrary);
  deployer.link(Commitment, NitroAdjudicator);
  deployer.link(Rules, NitroAdjudicator);
  deployer.deploy(NitroLibrary).then(function() {
    return deployer.deploy(NitroAdjudicator, NitroLibrary.address);
  });
};
