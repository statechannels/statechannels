import fs from 'fs';
import path from 'path';
import log from 'loglevel';
import {GanacheServer} from '@statechannels/devtools';
import writeJsonFile from 'write-json-file';
import {deployContracts} from './deployer';

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, '../', GANACHE_CONTRACTS_FILE);
const GANACHE_CONTRACTS_BACKUP_PATH = path.join(__dirname, '../', `${GANACHE_CONTRACTS_FILE}.bak`);

export async function startGanacheAndDeploy(): Promise<GanacheServer> {
  // TODO: This should probably merge the existing file instead of replacing it
  log.info(`Moving existing network context file to : ${GANACHE_CONTRACTS_BACKUP_PATH}\n`);
  fs.renameSync(GANACHE_CONTRACTS_PATH, GANACHE_CONTRACTS_BACKUP_PATH);
  log.info(`Writing network context into file: ${GANACHE_CONTRACTS_PATH}\n`);
  try {
    const chain = new GanacheServer(Number(process.env.GANACHE_PORT));
    chain.onClose(exitHandler);
    await chain.ready();

    const networkContext = (await deployContracts(chain)) as {NetworkID: string};
    networkContext.NetworkID = process.env.GANACHE_NETWORK_ID || '123456789';
    await writeJsonFile(GANACHE_CONTRACTS_PATH, networkContext);

    log.info(`Network context written to ${GANACHE_CONTRACTS_FILE}`);
    return chain;
  } catch (e) {
    if (!fs.existsSync(GANACHE_CONTRACTS_PATH)) {
      fs.renameSync(GANACHE_CONTRACTS_BACKUP_PATH, GANACHE_CONTRACTS_PATH);
    }
    throw Error(e);
  }
}

async function exitHandler() {
  try {
    fs.unlink(GANACHE_CONTRACTS_PATH, () => {
      log.info(`Deleted locally deployed network context: ${GANACHE_CONTRACTS_FILE}`);

      fs.renameSync(GANACHE_CONTRACTS_BACKUP_PATH, GANACHE_CONTRACTS_PATH);
      log.info(`Restored original file from ${GANACHE_CONTRACTS_BACKUP_PATH}`);
    });
  } catch (e) {
    log.warn(`Failed to properly clean up`);
    log.error(e);
  }
}
