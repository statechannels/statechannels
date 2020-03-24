import './env'; // Note: importing this module has the side effect of modifying env vars

import FirebaseServer from 'firebase-server';
import {setupGanache} from '@statechannels/devtools';
import {deploy} from './deployment/deploy';
import {startServer} from './src/server';

async function setupGanacheAndContracts() {
  const {deployer} = await setupGanache();
  const deployedArtifacts = await deploy(deployer);

  process.env = {...process.env, ...deployedArtifacts};
}

async function startLocalFirebaseServer() {
  const server = new FirebaseServer(5555, 'localhost');

  const closeServer = () => server.close;

  process.on('SIGINT', closeServer);
  process.on('SIGTERM', closeServer);
  process.on('uncaughtException', e => {
    closeServer();
    throw e;
  });
  process.on('exit', closeServer);
  process.on('unhandledRejection', closeServer);
}

async function start() {
  await setupGanacheAndContracts();
  await startLocalFirebaseServer();
  await startServer();
}

if (require.main === module) {
  start();
}
