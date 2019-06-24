const { deployContracts } = require('./deployContracts');
const fs = require('fs-extra');

module.exports = {
  deployContractsToTestnets
};

// This function will:
// - clear the buildContractsPath directory
// - set TARGET_NETWORK environment variable to a testnet
// - call deployContracts()
// - repeat for 3 testets
// - overwrite artifact with a copy where only certain fields have been selected
// - save this file to the appPreBuiltContractArtifactsPath directory

const deployToTestnet = async target => {
  process.env.TARGET_NETWORK = target;
  await deployContracts();
};

async function deployContractsToTestnets(buildContractsPath, appPreBuiltContractArtifactsPath) {
  fs.emptyDirSync(buildContractsPath, '');
  try {
    const ropsten = deployToTestnet('ropsten');
    const kovan = deployToTestnet('kovan');
    const rinkeby = deployToTestnet('rinkeby');

    const _ = await Promise.all([ropsten, kovan, rinkeby]);
    return fs.readdir(buildContractsPath, function(err, artifacts) {
      for (var i = 0; i < artifacts.length; i++) {
        fs.readJson(path.join(buildContractsPath, artifacts[i])).then(artifact => {
          const strippedArtifact = {
            contractName: artifact.contractName,
            abi: artifact.abi,
            bytecode: artifact.bytecode,
            networks: artifact.networks
          };

          let data = JSON.stringify(strippedArtifact, null, 2);

          fs.outputFile(path.format({ dir: appPreBuiltContractArtifactsPath, name: artifact.contractName, ext: '.json' }), data, err => {
            if (err) {
              throw err;
            }
          });
          console.log('Saved ' + artifact.contractName);
        });
      }
    });
  } catch (err) {
    console.log(err);
  }
}
