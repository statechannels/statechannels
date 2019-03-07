const { deployContracts } = require('./deployContracts');

const fs = require('fs-extra');

module.exports = {
  preDeployContracts: function(buildContractsPath, appPreBuiltContractArtifactsPath) {
    fs.emptyDirSync(buildContractsPath, '');
    process.env.TARGET_NETWORK = 'ropsten';
    console.log('deploying to ropsten');
    deployContracts()
      .then(() => {
        process.env.TARGET_NETWORK = 'kovan';
        console.log('deploying to kovan');
        return deployContracts();
      })
      .then(() => {
        process.env.TARGET_NETWORK = 'rinkeby';
        console.log('deploying to rinkeby');
        return deployContracts();
      })
      .then(() => {
        fs.readdir(buildContractsPath + '/', function(err, artifacts) {
          for (var i = 0; i < artifacts.length; i++) {
            fs.readJson(buildContractsPath + '/' + artifacts[i])
              .then(artifact => {
                const strippedArtifact = {
                  contractName: artifact.contractName,
                  abi: artifact.abi,
                  bytecode: artifact.bytecode,
                  networks: artifact.networks
                };

                let data = JSON.stringify(strippedArtifact, null, 2);

                fs.outputFile(
                  appPreBuiltContractArtifactsPath + '/' + artifact.contractName + '.json', data,
                  err => {
                  if (err) {
                    throw err;
                  }
                });

                console.log('Saved ' + artifact.contractName);
              })
              .catch(err => {
                console.error(err);
              });
          }
        });
      })
      .catch(error => console.log(error));
  }
};
