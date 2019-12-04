const rpsArtifact = require('../build/contracts/RockPaperScissors');
const { GanacheDeployer } = require('@statechannels/devtools');

const deploy = async deployer => {
  deployer = deployer || new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const RPS_CONTRACT_ADDRESS = await deployer.deploy(rpsArtifact);
  return { RPS_CONTRACT_ADDRESS };
};

module.exports = {
  deploy,
};
