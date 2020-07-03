fs = require('fs');
path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

if (process.env.NODE_ENV !== 'production') {
  const {configureEnvVariables} = require('@statechannels/devtools');
  configureEnvVariables();
}

const {spawn} = require('child_process');

const cmd = 'yarn';
const args = ['run', 'etherlime', 'compile', '--buildDirectory=./build/contracts', '--runs=200'];

if (process.env.USE_NATIVE_SOLC === 'true') {
  console.log('Using native solc version for compilation');
  args.push('--solcVersion=native');
}

const compile = spawn(cmd, args);

compile.stdout.on('data', data => {
  console.log(data.toString());
});

compile.stderr.on('data', data => {
  throw data.toString();
});

compile.on('close', code => {
  stripArtifacts();
  process.exit(code);
});

// strip out uneeded entries from artifacts
function stripArtifacts() {
  const files = fs.readdirSync(path.resolve(__dirname, '../build/contracts'));
  console.log('Stripping uneeded entried from the following artifacts: ', files);
  for (file in files) {
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
