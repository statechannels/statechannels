const sapArtifact = require('../build/contracts/SingleAssetPayments');
const {GanacheDeployer} = require('@statechannels/devtools');

const deploy = async deployer => {
  deployer = deployer || new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS = await deployer.deploy(sapArtifact);
  return {SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS};
};

module.exports = {
  deploy
};
