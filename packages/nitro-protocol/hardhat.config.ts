export default {
  solidity: {
    version: '0.7.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
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
  paths: {
    sources: 'contracts',
    deploy: 'hardhat-deploy',
    deployments: 'hardhat-deployments',
  },
};
