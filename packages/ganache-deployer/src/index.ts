import {GanacheServer} from '@statechannels/devtools';
import fs from 'fs';
import log from 'loglevel';
import path from 'path';
import {loadDeployments} from './deployer';
export {GanacheNCacheDeployer} from './deployer';

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, '../', GANACHE_CONTRACTS_FILE);

// Returns the old style network context expected by the packages.
// Note that if multiple copies of a contract are deployed, this will just return the last address.
// TODO: replace with a more-reliable method.
export function getNetworkContext() {
  const deployments = loadDeployments() || [];
  // should be a mapping of name -> address
  const networkContext = {
    // TODO: don't hardcode this here. Individual packages should set this themselves.
    // (Currently used in the wallet)
    NetworkID: '9001',
  };
  deployments.forEach(
    deployment => (networkContext[deployment.name] = {address: deployment.address})
  );

  return networkContext;
}

// WARNING: the name here is misleading. This function doesn't currently do any deployment.
// TODO: rename
export async function startGanacheAndDeploy(): Promise<GanacheServer> {
  try {
    const chain = new GanacheServer(Number(process.env.GANACHE_PORT));
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
