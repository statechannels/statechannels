const fs = require('fs');

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

let devServer;
let trackerServer;

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  if (devServer) {
    devServer.kill();
  }
  if (trackerServer) {
    trackerServer.kill();
  }
  throw err;
});

const {spawn} = require('child_process');
const {getNetworkName, setupGanache, configureEnvVariables} = require('@statechannels/devtools');
const {deploy} = require('../deployment/deploy');

// Ensure environment variables are read.
configureEnvVariables();

void (async () => {
  process.on('SIGINT', () => {
    if (devServer) {
      devServer.kill();
    }
    if (trackerServer) {
      trackerServer.kill();
    }
  });
  process.on('SIGTERM', () => {
    if (devServer) {
      devServer.kill();
    }
    if (trackerServer) {
      trackerServer.kill();
    }
  });
  process.on('exit', () => {
    if (devServer) {
      devServer.kill();
    }
    if (trackerServer) {
      trackerServer.kill();
    }
  });

  const {deployer} = await setupGanache(process.env.WEB3TORRENT_DEPLOYER_ACCOUNT_INDEX);
  const deployedArtifacts = await deploy(deployer);

  // We must edit .env.local since there is no easy programmatic way to inject
  // environment variables into the react-scripts start command.

  let data = '# NOTE: This file is auto-generated. Use .env.development.local for custom values\n';
  for (const artifactName in deployedArtifacts) {
    data += `REACT_APP_${artifactName} = ${deployedArtifacts[artifactName]}\n`;
  }
  data += `REACT_APP_TARGET_NETWORK = ${getNetworkName(process.env.CHAIN_NETWORK_ID)}\n`;
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
