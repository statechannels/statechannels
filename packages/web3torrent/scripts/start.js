// TODO connect to *existing* ganache. Here we start a new instance to aid development.

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

let ganacheServer;
let devServer;

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  if (ganacheServer) {
    ganacheServer.close();
  }
  if (devServer) {
    devServer.close();
  }
  throw err;
});

const {spawn} = require('child_process');
const {getNetworkName, setupGanache, configureEnvVariables} = require('@statechannels/devtools');
const {deploy} = require('../deployment/deploy');

// Ensure environment variables are read.
configureEnvVariables();

void (async () => {
  const {deployer} = await setupGanache();
  const deployedArtifacts = await deploy(deployer);

  process.env = {...process.env, ...deployedArtifacts};

  process.env.TARGET_NETWORK = getNetworkName(process.env.CHAIN_NETWORK_ID);

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  const cmd = 'yarn';
  const args = ['run', 'react-scripts', 'start'];

  const devServer = spawn(cmd, args);

  devServer.stdout.on('data', data => {
    console.log(data.toString());
  });

  devServer.stderr.on('data', data => {
    throw data.toString();
  });

  devServer.on('close', code => {
    process.exit(code);
  });
})();
