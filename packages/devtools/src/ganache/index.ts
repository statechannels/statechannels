import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import writeJsonFile = require('write-json-file');
import {ethers} from 'ethers';

import {ETHERLIME_ACCOUNTS} from '../constants';
import {Account} from '../types';

import {GanacheDeployer} from './deployer';
import {GanacheNCacheDeployer} from './deployer-with-cache';
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
const sayError = (msg: string) => console.log(chalk.red(msg));

interface SharedReturnType {
  deployer: GanacheNCacheDeployer;
  type: 'shared';
}

interface IndividualReturnType {
  deployer: GanacheDeployer;
  server: GanacheServer;
  type: 'individual';
}

async function startOwnGanache(p: Partial<Params> = {}): Promise<GanacheServer> {
  const port = Number(p.port || process.env.GANACHE_PORT || 8545);
  const chainId = Number(p.chainId || process.env.CHAIN_NETWORK_ID || 9001);
  const accounts = p.accounts || ETHERLIME_ACCOUNTS;
  const timeout = Number(p.timeout || process.env.GANACHE_TIMEOUT || 5000);
  const gasLimit = Number(p.gasLimit || process.env.GANACHE_GAS_LIMIT || 1000000000);
  const gasPrice = Number(p.gasPrice || process.env.GANACHE_GAS_PRICE || 1);

  const server = new GanacheServer(port, chainId, accounts, timeout, gasLimit, gasPrice);

  process.on('SIGINT', () => server && server.close());
  process.on('SIGTERM', () => server && server.close());
  process.on('uncaughtException', (e) => {
    server && server.close();
    throw e;
  });
  process.on('exit', () => server && server.close());
  process.on('unhandledRejection', () => server && server.close());

  say(`Starting a ganache server on http://localhost:${port}`);

  await server.ready();
  return server;
}

export const setupGanache = async (
  deployerAccountIndex: number | string
): Promise<SharedReturnType | IndividualReturnType> => {
  const useShared = process.env.USE_GANACHE_DEPLOYMENT_CACHE === 'true';
  const port = Number(process.env.GANACHE_PORT || 8545);

  let server;
  let deployer;
  let type: 'shared' | 'individual';
  if (useShared) {
    say(
      `The USE_GANACHE_DEPLOYMENT_CACHE option is set. Using ganache in shared mode with cached deployments. Port = ${port}.`
    );
    const cacheFolder = process.env.GANACHE_CACHE_FOLDER;
    if (!cacheFolder) {
      sayError(
        "Didn't find a GANACHE_CACHE_FOLDER in the env. Without this you can't use a shared ganache instance with cache."
      );
      throw Error('Missing GANACHE_CACHE_FOLDER in env.');
    }

    const foundGanache = await ganacheIsRunning(port);
    if (!foundGanache) {
      sayError(
        `Didn't find a ganache instance at http://localhost:${port}. To use the deployments cache you must start ganache separately. Did you run 'yarn start:shared-ganache'?`
      );
      throw Error(`Ganache not running on port ${port}`);
    }

    say(`Found shared ganache instance running on http://localhost:${port}.`);

    const deploymentsFile = path.join(
      process.cwd(),
      cacheFolder,
      `ganache-deployments-${port}.json`
    );
    if (!fs.existsSync(deploymentsFile)) {
      sayError(`Didn't find the deployments cache at ${deploymentsFile}.`);
      say(
        'This probably means that another package is running a regular ganache instance (without deployment cache) on this port.'
      );
      say(
        'This is bad because it will lead to confusing behaviour from an invalid deployment cache, if this regular ganache instance is restarted.'
      );
      say(
        'Please change the GANACHE_PORT environment variable in one of these packages, or run them both with USE_GANACHE_DEPLOYMENT_CACHE set.'
      );
      throw Error(`Deployments cache doesn't exist`);
    }
    say(`Using the deployments cache at ${deploymentsFile}.`);

    deployerAccountIndex = Number(deployerAccountIndex);
    if (!Number.isFinite(deployerAccountIndex))
      throw new Error(`Invalid deployerAccountIndex ${deployerAccountIndex}`);
    if (deployerAccountIndex < 0 || deployerAccountIndex >= ETHERLIME_ACCOUNTS.length)
      throw new Error(
        `deployerAccountIndex ${deployerAccountIndex} out of range [0,${ETHERLIME_ACCOUNTS.length}]`
      );

    const deployerAccountKey = ETHERLIME_ACCOUNTS[deployerAccountIndex].privateKey;

    type = 'shared';
    deployer = new GanacheNCacheDeployer(port, deploymentsFile, deployerAccountKey);
  } else {
    say(
      'The USE_GANACHE_DEPLOYMENT_CACHE option is not set, so starting an individual ganache instance.'
    );
    const foundGanache = await ganacheIsRunning(port);
    if (foundGanache) {
      sayError(
        `Found a ganache instance already running at http://localhost:${port}. Try changing your GANACHE_PORT env variable!`
      );
      throw Error(`Ganache already running on port ${port}`);
    }
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
