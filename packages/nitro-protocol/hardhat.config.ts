/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';

const config = {
  solidity: {
    version: '0.6.12',
    settings: {
      outputSelection: {
        '*': {
          '*': [
            'evm.bytecode.object',
            'evm.deployedBytecode.object',
            'abi',
            'evm.bytecode.sourceMap',
            'evm.deployedBytecode.sourceMap',
          ],
          '': ['ast'],
        },
      },
    },
  },
  namedAccounts: {
    deployer: {},
  },
  networks: {},
  paths: {
    sources: 'contracts',
    deploy: 'hardhat-deploy',
    deployments: 'hardhat-deployments',
  },
};

const infuraToken = process.env.INFURA_TOKEN;
const rinkebyDeployerPK = process.env.RINKEBY_DEPLOYER_PK;
if (infuraToken && rinkebyDeployerPK) {
  config.networks['rinkeby'] = {
    url: 'https://rinkeby.infura.io/v3/' + infuraToken,
    accounts: [rinkebyDeployerPK],
  };
  config.namedAccounts.deployer = {
    rinkeby: '0x87612aAD373586A38062c29F833A2AbC72038591',
    // Address used for the initial deploy of the contracts.
    // Ask @kerzhner for the private key if you would like to deploy from the same address
    // Otherwise uncomment the line below
    //rinkeby: 0,
  };
}

module.exports = config;
