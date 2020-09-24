/* eslint-disable no-process-env */
import {GanacheServer} from '@statechannels/devtools';
import {utils} from 'ethers';

import {defaultConfig} from '../src/config';
import {deploy} from '../deployment/deploy';

export default async function setup(): Promise<void> {
  const account = {
    privateKey: defaultConfig.serverPrivateKey,
    amount: utils.parseEther('100').toString(),
  };
  if (!process.env.GANACHE_PORT) {
    throw new Error('process.env.GANACHE_PORT must be defined');
  }
  const ganacheServer = new GanacheServer(parseInt(process.env.GANACHE_PORT), 1337, [account]);
  await ganacheServer.ready();

  const deployedArtifacts = await deploy();

  process.env = {...process.env, ...deployedArtifacts};

  (global as any).__ARTIFACTS__ = deployedArtifacts;
  (global as any).__GANACHE_SERVER__ = ganacheServer;
}
