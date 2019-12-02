const rpsArtifact = require('../build/contracts/RockPaperScissors');

const { ETHERLIME_ACCOUNTS } = require('@statechannels/devtools');
const { GanacheNCacheDeployer } = require('@statechannels/ganache-deployer');

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547, ETHERLIME_ACCOUNTS[3].privateKey);

  await deployer.deploy(rpsArtifact);
};

module.exports = {
  deploy,
};
