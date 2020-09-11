let compilerType = 'solcjs';
if (process.env.USE_NATIVE_SOLC === 'true') {
  console.log('Using native solc for compilation');
  compilerType = 'native';
} else {
  console.log('Using solcjs for compilation');
}

module.exports = {
  compilerType,
  compilerVersion: '0.6.2',
  sourceDirectory: './contracts',
  outputDirectory: './build/contracts',
  outputType: 'multiple',
  compilerOptions: {
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
};
