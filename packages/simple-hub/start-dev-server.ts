import './env'; // Note: importing this module has the side effect of modifying env vars

import FirebaseServer from 'firebase-server';
import {setupGanache, getNetworkName} from '@statechannels/devtools';
import {deploy} from './deployment/deploy';
import {startServer} from './src/server';
import {log} from './src/logger';

async function setupGanacheAndContracts() {
  if (getNetworkName(process.env.CHAIN_NETWORK_ID) === 'development') {
    const {deployer} = await setupGanache(Number(process.env.SIMPLE_HUB_DEPLOYER_ACCOUNT_INDEX));
    const deployedArtifacts = await deploy(deployer);

    process.env = {...process.env, ...deployedArtifacts};
  }
}

async function startLocalFirebaseServer() {
  const firebaseLog = log.child({context: 'firebase'});
  firebaseLog.info('Starting server');
  const server = new FirebaseServer(5555, 'localhost');
  firebaseLog.info('Started');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const closeServer = (msg: string) => async (err?: any) => {
    firebaseLog.info({err}, 'Closing server: %s', msg);
    await server.close();
    firebaseLog.info('Closed');
  };

  process.on('SIGINT', closeServer('SIGINT'));
  process.on('SIGTERM', closeServer('SIGTERM'));
  process.on('uncaughtException', async e => {
    await closeServer('uncaughtException')(e);
    throw e;
  });
  process.on('exit', closeServer('exit'));
  process.on('unhandledRejection', closeServer('unhandledRejection'));
}

async function start() {
  await startLocalFirebaseServer();
  await setupGanacheAndContracts();
  await startServer();
}

if (require.main === module) {
  start();
}
