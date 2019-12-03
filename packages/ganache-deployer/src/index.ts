import {GanacheServer} from '@statechannels/devtools';
import fs from 'fs';
import log from 'loglevel';
import path from 'path';
export {GanacheNCacheDeployer} from './deployer';

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, '../', GANACHE_CONTRACTS_FILE);

// A simple wrapper around a ganache server that ensures that `ganache-network-context.json`
// is removed when the server is shutdown.
export async function startGanacheNCacheServer(
  port: number,
  chainNetworkId: number
): Promise<GanacheServer> {
  try {
    const chain = new GanacheServer(port, chainNetworkId);
    chain.onClose(exitHandler);
    await chain.ready();

    return chain;
  } catch (e) {
    throw Error(e);
  }
}

async function exitHandler() {
  try {
    fs.unlinkSync(GANACHE_CONTRACTS_PATH);
    log.info(`Deleted locally deployed network context: ${GANACHE_CONTRACTS_FILE}`);
  } catch (e) {
    log.warn(`Failed to properly clean up`);
    log.error(e);
  }
}
