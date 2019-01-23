var State = artifacts.require('./State.sol');
var Rules = artifacts.require('./Rules.sol');
var ConsensusState = artifacts.require('./ConsensusState.sol');
var ConsensusGame = artifacts.require('./ConsensusGame.sol');

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, Rules);
  deployer.deploy(Rules);

  deployer.link(State, ConsensusState);
  deployer.deploy(ConsensusState);

  deployer.link(State, ConsensusGame);
  deployer.link(Rules, ConsensusGame);
  deployer.link(ConsensusState, ConsensusGame);
  deployer.deploy(ConsensusGame);
};
