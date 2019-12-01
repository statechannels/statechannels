const rpsArtifact = require('../build/contracts/RockPaperScissors');

const { GanacheNCacheDeployer } = require('@statechannels/ganache-deployer');

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  await deployer.deploy(rpsArtifact);
};

module.exports = {
  deploy,
};
