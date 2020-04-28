const fs = require('fs');

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
configureEnvVariables(true);

void (async () => {
  const networkName = getNetworkName(process.env.CHAIN_NETWORK_ID);

  let data = '# NOTE: This file is auto-generated. Use .env.development.local for custom values\n';

  if (networkName === 'development') {
    const {deployer} = await setupGanache(process.env.WEB3TORRENT_DEPLOYER_ACCOUNT_INDEX);
    const deployedArtifacts = await deploy(deployer);
    for (const artifactName in deployedArtifacts) {
      data += `REACT_APP_${artifactName} = ${deployedArtifacts[artifactName]}\n`;
    }
  }

  data += `REACT_APP_TARGET_NETWORK = ${networkName}\n`;

  // We must edit .env.local since there is no easy programmatic way to inject
  // environment variables into the react-scripts start command.
  fs.writeFile('.env.local', data, err => {
    if (err) throw err;
  });

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

  const trackerServer = spawn(cmd, ['run', 'start:tracker']);

  trackerServer.stdout.on('data', data => {
    console.log(data.toString());
  });

  trackerServer.stderr.on('data', data => {
    console.log(data.toString());
  });

  trackerServer.on('close', code => {
    process.exit(code);
  });
})();
