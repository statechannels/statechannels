import * as fs from 'fs';

import chalk from 'chalk';
import writeJsonFile = require('write-json-file');
import {ethers} from 'ethers';

import {TEST_ACCOUNTS} from '../constants';
import {Account} from '../types';

import {GanacheServer} from './server';

export const ganacheIsRunning = async (port: number): Promise<boolean> => {
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${port}`);
  try {
    await provider.getBlockNumber();
    return true;
  } catch (e) {
    return false;
  }
};

const say = (msg: string) => console.log(chalk.cyan(msg));

async function startOwnGanache(p: Partial<Params> = {}): Promise<GanacheServer> {
  const port = Number(p.port || process.env.GANACHE_PORT || 8545);
  const chainId = Number(p.chainId || process.env.CHAIN_NETWORK_ID || 9001);
  const accounts = p.accounts || TEST_ACCOUNTS;
  const timeout = Number(p.timeout || process.env.GANACHE_TIMEOUT || 5000);
  const gasLimit = Number(p.gasLimit || process.env.GANACHE_GAS_LIMIT || 1000000000);
  const gasPrice = Number(p.gasPrice || process.env.GANACHE_GAS_PRICE || 1);

  const server = new GanacheServer(port, chainId, accounts, timeout, gasLimit, gasPrice);

  process.on('SIGINT', () => server && server.close());
  process.on('SIGTERM', () => server && server.close());
  process.on('uncaughtException', e => {
    server && server.close();
    throw e;
  });
  process.on('exit', () => server && server.close());
  process.on('unhandledRejection', () => server && server.close());

  say(`Starting a ganache server on http://localhost:${port}`);

  await server.ready();
  return server;
}

interface Params {
  port: number;
  chainId: number;
  accounts: Account[];
  timeout: number;
  gasLimit: number;
  gasPrice: string;
}

// just need to make sure that the deploymentsPath is deleted at the end
export async function startSharedGanache(
  deploymentsPath: string,
  p: Partial<Params> = {}
): Promise<GanacheServer | undefined> {
  const port = Number(p.port || process.env.GANACHE_PORT);

  if (isNaN(port)) {
    say(`No port provided. Did you set GANACHE_PORT in the env? Continuing with default.`);
  }

  if (await ganacheIsRunning(port)) {
    say(`A shared ganache instance is already running on http://localhost:${port}`);
    return undefined;
  }

  const server = await startOwnGanache({...p, port});

  say(`Deployments will be written to ${deploymentsPath}.`);
  writeJsonFile(deploymentsPath, {deploymentsFileVersion: '0.1', deployments: []});

  server.onClose(() => fs.existsSync(deploymentsPath) && fs.unlinkSync(deploymentsPath));

  return server;
}
