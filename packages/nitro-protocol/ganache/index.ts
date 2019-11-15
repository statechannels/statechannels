import { GanacheServer } from '@statechannels/devtools';
import dotEnvExtended from 'dotenv-extended';
import fs from 'fs';
import log from 'loglevel';
import path from 'path';
import writeJsonFile from 'write-json-file';

import { deployContracts } from './deployer';

dotEnvExtended.load();

log.setDefaultLevel(log.levels.INFO);

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, GANACHE_CONTRACTS_FILE);
log.info(`Writing network context into file: ${GANACHE_CONTRACTS_PATH}\n`);

/*
  TODO: Move this file to the devtools package.
*/

(async () => {
  try {
    if (!process.env.GANACHE_PORT) {
      throw Error(
        'Cannot start ganache server without a specified port. Set port via the GANACHE_PORT env var'
      );
    }

    const port = Number(process.env.GANACHE_PORT);

    const chain = new GanacheServer(port);
    await chain.ready();

    // catch various ways to ensure network context file is deleted
    process.on('exit', exitHandler.bind(null, chain));
    process.on('SIGINT', exitHandler.bind(null, chain));
    process.on('SIGUSR1', exitHandler.bind(null, chain));
    process.on('SIGUSR2', exitHandler.bind(null, chain));

    const networkContext = await deployContracts(chain);
    networkContext['NetworkID'] = process.env.GANACHE_NETWORK_ID;
    await writeJsonFile(GANACHE_CONTRACTS_PATH, networkContext);

    log.info(`Network context written to ${GANACHE_CONTRACTS_FILE}`);
  } catch (e) {
    throw Error(e);
  }
})();

async function exitHandler(chain: GanacheServer) {
  await chain.close();
  fs.unlink(GANACHE_CONTRACTS_PATH, () => {
    log.info(`Deleted locally deployed network context: ${GANACHE_CONTRACTS_FILE}`);
  });
}
