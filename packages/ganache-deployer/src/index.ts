import fs from 'fs';
import path from 'path';
import log from 'loglevel';
import {GanacheServer} from '@statechannels/devtools';
import writeJsonFile from 'write-json-file';
import {deployContracts} from './deployer';

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, '../', GANACHE_CONTRACTS_FILE);

export function getNetworkContext() {
  if (!fs.existsSync(GANACHE_CONTRACTS_PATH)) {
    throw Error("Couldn't find contract addresses. Has the ganache-deployer run?");
  }
  const rawData = fs.readFileSync(GANACHE_CONTRACTS_PATH);
  return JSON.parse(rawData.toString());
}

export async function startGanacheAndDeploy(): Promise<GanacheServer> {
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
