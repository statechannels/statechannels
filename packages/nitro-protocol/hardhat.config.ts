import 'hardhat-watcher';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-etherscan';
import {HardhatUserConfig} from 'hardhat/config';

const infuraToken = process.env.INFURA_TOKEN;
const rinkebyDeployerPK = process.env.RINKEBY_DEPLOYER_PK;
if (!infuraToken) {
  console.warn(`Invalid infura token ${infuraToken}`);
}
if (!rinkebyDeployerPK) {
  console.warn(`Invalid deploy private key ${rinkebyDeployerPK}`);
}
const config: HardhatUserConfig = {
  solidity: {
    version: '0.7.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      rinkeby: 0,
      // The below address was used for the initial deploy of the contracts.
      // Ask @kerzhner for the private key if you would like to deploy from the same address
      // And swap the line above for the line below:
      // rinkeby: '0x87612aAD373586A38062c29F833A2AbC72038591',
    },
  },
  paths: {
    sources: 'contracts',
    deploy: 'hardhat-deploy',
    deployments: 'hardhat-deployments',
  },
  watcher: {
    compilation: {
      tasks: ['compile'],
      verbose: true,
    },
  },
  networks: {
    rinkeby: {
      url: infuraToken ? 'https://rinkeby.infura.io/v3/' + infuraToken : undefined,
      accounts: rinkebyDeployerPK ? [rinkebyDeployerPK] : undefined,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
