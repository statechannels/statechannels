import 'hardhat-watcher';

export default {
  solidity: {
    version: '0.7.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
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
};
