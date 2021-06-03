/* eslint-disable no-process-env */
import * as fs from 'fs';

import {TEST_ACCOUNTS, GanacheServer} from '@statechannels/devtools';
import {utils} from 'ethers';

import {deploy} from '../deployment/deploy';
export const ARTIFACTS_DIR = '../../artifacts';
export default async function setup(): Promise<void> {
  try {
    fs.mkdirSync(ARTIFACTS_DIR);
  } catch (err) {
    if (err.message !== "EEXIST: file already exists, mkdir '../../artifacts'") throw err;
  }

  if (process.env.CHAIN_NETWORK_ID) {
    console.log(
      `CHAIN_NETWORK_ID defined as ${process.env.CHAIN_NETWORK_ID}. Assuming chain env vars are set by caller`
    );
    return;
  }

  process.env['CHAIN_NETWORK_ID'] = '9002';
  process.env['GANACHE_HOST'] = '0.0.0.0';
  process.env['GANACHE_PORT'] = '8545';
  process.env[
    'RPC_ENDPOINT'
  ] = `http://${process.env['GANACHE_HOST']}:${process.env['GANACHE_PORT']}`;

  const accounts = TEST_ACCOUNTS.map(account => ({
    ...account,
    amount: utils.parseEther('100').toString(),
  }));

  if (!process.env.GANACHE_PORT) {
    throw new Error('process.env.GANACHE_PORT must be defined');
  }
  const ganacheServer = new GanacheServer(
    parseInt(process.env.GANACHE_PORT),
    Number(process.env.CHAIN_NETWORK_ID),
    accounts,
    10_000, // timeout
    10_00_000_000, // gasLimit
    1 // gasPrice
  );
  await ganacheServer.ready();

  const deployedArtifacts = await deploy();

  process.env = {...process.env, ...deployedArtifacts};

  (global as any).__GANACHE_SERVER__ = ganacheServer;
}
