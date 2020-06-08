const consensusAppArtifact = require('../build/contracts/ConsensusApp.json');
const countingAppArtifact = require('../build/contracts/CountingApp.json');
const erc20AssetHolderArtifact = require('../build/contracts/TestErc20AssetHolder.json');
const ethAssetHolderArtifact = require('../build/contracts/TestEthAssetHolder.json');
const nitroAdjudicatorArtifact = require('../build/contracts/NitroAdjudicator.json');
const singleAssetPaymentsArtifact = require('../build/contracts/SingleAssetPayments.json');
const testAssetHolderArtifact1 = require('../build/contracts/TESTAssetHolder.json');
const testAssetHolderArtifact2 = require('../build/contracts/TESTAssetHolder2.json');
const testForceMoveArtifact = require('../build/contracts/TESTForceMove.json');
const testNitroAdjudicatorArtifact = require('../build/contracts/TESTNitroAdjudicator.json');
const tokenArtifact = require('../build/contracts/Token.json');
const trivialAppArtifact = require('../build/contracts/TrivialApp.json');

const {GanacheDeployer} = require('@statechannels/devtools');

const deploy = async () => {
  const deployer = new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(nitroAdjudicatorArtifact);

  const COUNTING_APP_ADDRESS = await deployer.deploy(countingAppArtifact);
  const SINGLE_ASSET_PAYMENT_ADDRESS = await deployer.deploy(singleAssetPaymentsArtifact);
  const TEST_NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(testNitroAdjudicatorArtifact);
  const CONSENSUS_APP_ADDRESS = await deployer.deploy(consensusAppArtifact);
  const TRIVIAL_APP_ADDRESS = await deployer.deploy(trivialAppArtifact);
  const TEST_FORCE_MOVE_ADDRESS = await deployer.deploy(testForceMoveArtifact);
  const TEST_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    testAssetHolderArtifact1,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );
  const TEST_ASSET_HOLDER2_ADDRESS = await deployer.deploy(
    testAssetHolderArtifact2,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );

  // for test purposes in this package, wire up the assetholders with the testNitroAdjudicator

  const TEST_TOKEN_ADDRESS = await deployer.deploy(tokenArtifact, {}, 0);
  const TEST_ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    ethAssetHolderArtifact,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );
  const TEST_TOKEN_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    erc20AssetHolderArtifact,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS,
    TEST_TOKEN_ADDRESS
  );
  return {
    NITRO_ADJUDICATOR_ADDRESS,
    COUNTING_APP_ADDRESS,
    SINGLE_ASSET_PAYMENT_ADDRESS,
    CONSENSUS_APP_ADDRESS,
    TRIVIAL_APP_ADDRESS,
    TEST_FORCE_MOVE_ADDRESS,
    TEST_NITRO_ADJUDICATOR_ADDRESS,
    TEST_TOKEN_ADDRESS,
    TEST_ETH_ASSET_HOLDER_ADDRESS,
    TEST_TOKEN_ASSET_HOLDER_ADDRESS,
    TEST_ASSET_HOLDER_ADDRESS,
    TEST_ASSET_HOLDER2_ADDRESS,
  };
};

module.exports = {
  deploy,
};
