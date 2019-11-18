import fs from 'fs';
import path from 'path';
import {GanacheServer} from '@statechannels/devtools';
import destroyable from 'server-destroy';
import dotEnvExtended from 'dotenv-extended';
import Koa from 'koa';
import Router from 'koa-router';
import log from 'loglevel';
import writeJsonFile from 'write-json-file';

import {deployContracts} from './deployer';

dotEnvExtended.load();

log.setDefaultLevel(log.levels.INFO);

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, GANACHE_CONTRACTS_FILE);
log.info(`Writing network context into file: ${GANACHE_CONTRACTS_PATH}\n`);

/*
  TODO: Move this file to the devtools package.
*/

const router = new Router();
router.get('/', async ctx => (ctx.body = {}));

if (!process.env.GANACHE_PORT) {
  throw Error(
    'Cannot start ganache server without a specified port. Set port via the GANACHE_PORT env var'
  );
}

// This server is exclusively used for detecting chain readiness in CI.
// In a local environment, it's effectively a no-op.
const port = Number(process.env.DEV_HTTP_SERVER_PORT);
const app = new Koa();
app.use(router.routes());
const server = app
  .listen(port)
  .on('error', err => console.error(err))
  .on('listening', async () => {
    log.info(`HTTP server listening on port ${port}`);
    await deploy();
  });
destroyable(server);

// This server is only used in CI to detect when the chain is ready and listens
// For various signals to ensure network context file is deleted
process.on('exit', exitHandler.bind(null, server));
process.on('SIGINT', exitHandler.bind(null, server));
process.on('SIGUSR1', exitHandler.bind(null, server));
process.on('SIGUSR2', exitHandler.bind(null, server));

async function deploy() {
  try {
    const chain = new GanacheServer(Number(process.env.GANACHE_PORT));
    await chain.ready();

    const networkContext = (await deployContracts(chain)) as {NetworkID: string};
    networkContext.NetworkID = process.env.GANACHE_NETWORK_ID;
    await writeJsonFile(GANACHE_CONTRACTS_PATH, networkContext);

    log.info(`Network context written to ${GANACHE_CONTRACTS_FILE}`);
  } catch (e) {
    throw Error(e);
  }
}

async function exitHandler(exitServer) {
  try {
    fs.unlink(GANACHE_CONTRACTS_PATH, () => {
      log.info(`Deleted locally deployed network context: ${GANACHE_CONTRACTS_FILE}`);
    });
    exitServer.destroy();
  } catch (e) {
    log.warn(`Failed to properly clean up`);
    log.error(e);
  }
}
