const tttArtifact = require('../build/contracts/TicTacToe');
const {GanacheDeployer} = require('@statechannels/devtools');

const deploy = async deployer => {
  deployer = deployer || new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const TTT_CONTRACT_ADDRESS = await deployer.deploy(tttArtifact);
  return {TTT_CONTRACT_ADDRESS};
};

module.exports = {
  deploy
};
