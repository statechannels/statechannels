const rpsArtifact = require('../build/contracts/RockPaperScissors');

const deploy = async deployer => {
  const RPS_CONTRACT_ADDRESS = await deployer.deploy(rpsArtifact);
  return { RPS_CONTRACT_ADDRESS };
};

module.exports = {
  deploy,
};
