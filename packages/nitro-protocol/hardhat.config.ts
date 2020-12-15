import 'hardhat-watcher';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-etherscan';

export default {
  chainId: 31337, // This is the default anyway https://hardhat.org/config/#hardhat-network
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
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
