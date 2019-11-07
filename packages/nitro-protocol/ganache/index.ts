import {configureEnvVariables, GanacheServer} from '@statechannels/devtools';
import Koa = require("koa");
import Router = require('koa-router');
import {deploy} from '../deployment/deploy-test';
import {logger} from './logger';
// configureEnvVariables();
const port = process.env.DEV_SERVER_PORT || 3000;

const router = new Router();
const body = {
  ganachePort: process.env.GANACHE_PORT,
  addresses: 'undefined',
};
router.get('/', async ctx => (ctx.body = JSON.stringify(body, null, 2)));

const server = new Koa();
server.use(logger);
server.use(router.routes());
server
  .listen(port)
  .on('error', err => console.error(err))
  .on('listening', async () => await startGanache());

async function startGanache() {
  const chain = new GanacheServer();
  await chain.ready();

  // Kill the ganache server when jest exits
  process.on('exit', async () => await chain.close());

  const network = await chain.provider.getNetwork();

  body.addresses = await deploy(network.chainId);

  console.log(`Contracts deployed: ${JSON.stringify(body.addresses, null, 2)}`);
}