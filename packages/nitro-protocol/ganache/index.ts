import {GanacheServer} from '@statechannels/devtools';
import Koa = require('koa');
import Router = require('koa-router');
import dotEnvExtended from 'dotenv-extended';
import log from 'loglevel';

import {deployContracts} from './deployer';
import {logger as serverLogger} from './logger';

dotEnvExtended.load();

log.setDefaultLevel(log.levels.INFO);

const serverPort = process.env.DEV_SERVER_PORT || 3000;

const router = new Router();
const body = {
  ganachePort: process.env.GANACHE_PORT,
  contracts: {},
};
router.get('/', async ctx => (ctx.body = JSON.stringify(body, null, 2)));

const server = new Koa();
server.use(serverLogger);
server.use(router.routes());
server
  .listen(serverPort)
  .on('error', err => console.error(err))
  .on('listening', async () => await startGanache());

async function startGanache() {
  log.info(`Starting contract deployment server on port ${serverPort}`);

  if (!process.env.GANACHE_PORT) {
    throw Error(
      'Cannot start ganache server without a specified port. Set port via the GANACHE_PORT env var'
    );
  }

  const port = Number(process.env.GANACHE_PORT);

  const chain = new GanacheServer(port);
  await chain.ready();

  process.on('exit', async () => await chain.close());

  body.contracts = await deployContracts(chain);

  log.info(`Contracts deployed: ${JSON.stringify(body.contracts, null, 2)}`);
}
