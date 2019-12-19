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
  console.log(data.toString());
});

compile.on('close', code => {
  process.exit(code);
});
