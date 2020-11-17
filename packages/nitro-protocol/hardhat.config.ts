export default {
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
  paths: {
    sources: 'contracts',
    deploy: 'hardhat-deploy',
    deployments: 'hardhat-deployments',
  },
};
