process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const {configureEnvVariables} = require('@statechannels/devtools');
const {spawn} = require('child_process');

configureEnvVariables();

const cmd = 'yarn';
const args = ['run', 'etherlime', 'compile', '--buildDirectory=./build/contracts'];

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
  process.exit(code);
});
