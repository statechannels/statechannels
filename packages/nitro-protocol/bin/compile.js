const fs = require('fs');
const path = require('path');

// Compilation with js config
const {compileAndSave, compile} = require('@ethereum-waffle/compiler');

async function main() {
  let compilerType = 'solcjs';
  if (process.env.USE_NATIVE_SOLC === 'true') {
    console.log('Using native solc for compilation');
    compilerType = 'native';
  } else {
    console.log('Using solcjs for compilation');
  }

  const config = {
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

  // compile and save the output
  await compileAndSave(config);
  stripArtifacts();
}

// strip out uneeded entries from artifacts
function stripArtifacts() {
  const files = fs.readdirSync(path.resolve(__dirname, '../build/contracts'));
  console.log('Stripping uneeded entries from the following artifacts: ', files);
  for (let file in files) {
    let artifact = require(path.resolve(__dirname, '../build/contracts/' + files[file]));
    // delete artifact['ast']; // we need this to generate documentation
    delete artifact['legacyAst'];
    delete artifact['source'];
    fs.writeFileSync(
      path.resolve(__dirname, '../build/contracts/' + files[file]),
      JSON.stringify(artifact, null, 2)
    );
  }
}
