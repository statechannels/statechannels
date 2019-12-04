import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
// import {ETHERLIME_ACCOUNTS} from '../constants';
import {JsonRpcProvider} from 'ethers/providers';
import {Account} from '../types';
import {ETHERLIME_ACCOUNTS} from '../constants';
import {GanacheServer} from './server';
import {GanacheNCacheDeployer} from './deployer-with-cache';
import {GanacheDeployer} from './deployer';

export const ganacheIsRunning = async (port: number): Promise<boolean> => {
  const provider = new JsonRpcProvider(`http://localhost:${port}`);
  try {
    await provider.getBlockNumber();
    return true;
  } catch (e) {
    return false;
  }
};

const say = (msg: string) => console.log(chalk.cyan(msg));

interface SharedReturnType {
  deployer: GanacheNCacheDeployer;
  type: 'shared';
}

interface IndividualReturnType {
  deployer: GanacheDeployer;
  server: GanacheServer;
  type: 'individual';
}

export const setupGanache = async (): Promise<SharedReturnType | IndividualReturnType> => {
  const sharedPort = Number(process.env.SHARED_GANACHE_PORT || '8547');

  const deploymentsFile = process.env.GANACHE_DEPLOYMENTS_FILE;
  const foundShared = await ganacheIsRunning(sharedPort);

  if (!deploymentsFile) {
    say(
      "Didn't find a GANACHE_DEPLOYMENTS_FILE in the env. Without this you can't use a shared ganache instance with cache."
    );
  } else if (!foundShared) {
    say(
      `Didn't find a shared ganache instance at http://localhost:${sharedPort}. Did you run 'yarn start:shared-ganache'?`
    );
  }

  let server;
  let deployer;
  let type;
  if (deploymentsFile && foundShared) {
    say(`Found shared ganache instance running on http://localhost:${sharedPort}.`);
    const deploymentsPath = path.join(process.cwd(), deploymentsFile);
    say(`Deployments will be written to ${deploymentsPath}.`);
    deployer = new GanacheNCacheDeployer(sharedPort, deploymentsPath);
    type = 'shared';
  } else {
    say('Starting our own server instead');
    server = await startOwnGanache();
    deployer = new GanacheDeployer(server.port);
    type = 'individual';
  }

  return {server, deployer, type};
};

interface Params {
  port: number;
  chainId: number;
  accounts: Account[];
  timeout: number;
  gasLimit: number;
  gasPrice: string;
}

export const startOwnGanache = async (p: Partial<Params> = {}): Promise<GanacheServer> => {
  const port = Number(p.port || process.env.GANACHE_PORT || 8545);
  const chainId = Number(p.chainId || process.env.CHAIN_NETWORK_ID || 9001);
  const accounts = p.accounts || ETHERLIME_ACCOUNTS;
  const timeout = Number(p.timeout || process.env.GANACHE_TIMEOUT || 5000);
  const gasLimit = Number(p.gasLimit || process.env.GANACHE_GAS_LIMIT || 1000000000);
  const gasPrice = Number(p.gasPrice || process.env.GANACHE_GAS_PRICE || 1);

  const server = new GanacheServer(port, chainId, accounts, timeout, gasLimit, gasPrice);

  process.on('SIGINT', () => server && server.close());
  process.on('SIGTERM', () => server && server.close());

  say(`Starting a ganche server on http://localhost:${port}`);

  await server.ready();
  return server;
};

// just need to make sure that the deploymentsPath is deleted at the end
export async function startSharedGanache(
  deploymentsPath: string,
  p: Partial<Params> = {}
): Promise<GanacheServer | undefined> {
  const port = Number(p.port || process.env.SHARED_GANACHE_PORT);

  if (isNaN(port)) {
    say(`No port provided. Did you set SHARED_GANACHE_PORT in the env? Continuing with default.`);
  }

  if (await ganacheIsRunning(port)) {
    say(`A shared ganache instance is already running on http://localhost:${port}`);
    return undefined;
  }

  const server = await startOwnGanache({...p, port});

  say(`Deployments will be written to ${deploymentsPath}.`);

  server.onClose(() => fs.existsSync(deploymentsPath) && fs.unlinkSync(deploymentsPath));

  return server;
}
