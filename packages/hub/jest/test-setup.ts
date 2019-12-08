import '../env';
import {GanacheServer} from '@statechannels/devtools';
import {deploy} from '../deployment/deploy';

export default async function setup() {
  if (!process.env.NODE_ENV) {
    throw Error(`The NODE_ENV env var must be set to "test"`);
  }
  if (process.env.NODE_ENV != 'test') {
    throw Error(
      `Run "yarn db:testSetup" and rerun the attempted script prefixed with "NODE_ENV=test"`
    );
  }

  const ganacheServer = new GanacheServer(
    Number(process.env.GANACHE_PORT),
    Number(process.env.CHAIN_NETWORK_ID)
  );
  await ganacheServer.ready();

  const deployedArtifacts = await deploy();

  process.env = {...process.env, ...deployedArtifacts};
  (global as any).__GANACHE_SERVER__ = ganacheServer;
}
