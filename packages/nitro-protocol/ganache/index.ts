import {GanacheServer} from '@statechannels/devtools';
import Koa = require('koa');
import Router = require('koa-router');
import {deploy} from './deployer';
import {logger} from './logger';

const serverPort = process.env.DEV_SERVER_PORT || 3000;

const router = new Router();
const body = {
  ganachePort: process.env.GANACHE_PORT,
  addresses: {},
};
router.get('/', async ctx => (ctx.body = JSON.stringify(body, null, 2)));

const server = new Koa();
server.use(logger);
server.use(router.routes());
server
  .listen(serverPort)
  .on('error', err => console.error(err))
  .on('listening', async () => await startGanache());

async function startGanache() {
  if (!process.env.GANACHE_PORT) {
    throw Error(
      'Cannot start ganache server without a specified port. Set port via the GANACHE_PORT env var'
    );
  }

  const port = Number(process.env.GANACHE_PORT);

  const chain = new GanacheServer(port);
  await chain.ready();

  process.on('exit', async () => await chain.close());

  body.addresses = await chain.deployContracts([]);

  console.log(`Contracts deployed: ${JSON.stringify(body.addresses, null, 2)}`);
}
