#! /usr/local/bin/node

import * as path from 'path';
import {configureEnvVariables} from '../config/env';
import {startSharedGanache} from '.';

configureEnvVariables();

void (async () => {
  const deploymentsFile = process.env.GANACHE_DEPLOYMENTS_FILE;

  if (!deploymentsFile) {
    throw Error('Must set a GANACHE_DEPLOYMENTS_FILE in env to start a shared ganache instance');
  }

  const deploymentsPath = path.join(process.cwd(), deploymentsFile);

  await startSharedGanache(deploymentsPath);
})();
