#! /usr/local/bin/node

import * as path from 'path';

import {configureEnvVariables} from '../config/env';

import {startSharedGanache} from '.';

configureEnvVariables();

void (async () => {
  const cacheFolder = process.env.GANACHE_CACHE_FOLDER;
  const port = Number(process.env.GANACHE_PORT || 8545);

  if (!cacheFolder) {
    throw Error('Must set a GANACHE_CACHE_FOLDER in env to start a shared ganache instance');
  }
  const deploymentsFile = path.join(process.cwd(), cacheFolder, `ganache-deployments-${port}.json`);

  await startSharedGanache(deploymentsFile, {port});
})();
