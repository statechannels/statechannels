var Commitment = artifacts.require('./Commitment.sol');
var Rules = artifacts.require('./Rules.sol');

var CountingCommitment = artifacts.require('./test-game/CountingCommitment.sol');
var CountingApp = artifacts.require('./test-game/CountingApp.sol');

module.exports = function(deployer) {
  deployer.deploy(Commitment);

  deployer.link(Commitment, Rules);
  deployer.deploy(Rules);

  deployer.link(Commitment, CountingCommitment);
  deployer.deploy(CountingCommitment);

  deployer.link(Commitment, CountingApp);
  deployer.link(CountingCommitment, CountingApp);
  deployer.link(Rules, CountingApp);
  deployer.deploy(CountingApp);
};
