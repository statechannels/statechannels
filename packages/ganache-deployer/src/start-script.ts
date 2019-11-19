#!/usr/bin/env node
import dotEnvExtended from 'dotenv-extended';
import Koa from 'koa';
import Router from 'koa-router';
import log from 'loglevel';
import destroyable from 'server-destroy';

import {GanacheServer} from '@statechannels/devtools';
import {startGanacheAndDeploy} from '.';

dotEnvExtended.load();

log.setDefaultLevel(log.levels.INFO);

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
let ganacheServer: GanacheServer;
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
    ganacheServer = await startGanacheAndDeploy();
  });
destroyable(server);

// This server is only used in CI to detect when the chain is ready and listens
// For various signals to ensure network context file is deleted
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

function exitHandler() {
  server.destroy();
  if (ganacheServer) {
    ganacheServer.close();
  }
}
