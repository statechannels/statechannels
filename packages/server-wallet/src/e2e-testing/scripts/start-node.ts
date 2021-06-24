import path from 'path';

import {TEST_ACCOUNTS} from '@statechannels/devtools';
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import {readFile} from 'jsonfile';

import {ARTIFACTS_DIR} from '../../../jest/chain-setup';
import {
  defaultTestWalletConfig,
  overwriteConfigWithDatabaseConnection,
  WalletConfig,
} from '../../config';
import {ServerWalletNode} from '../server-wallet-node';
import {DBAdmin} from '../..';
setupNode().then(serverNode => serverNode.listen());

enum Partcipants {
  A = 'A',
  B = 'B',
}
type RoleConfig = {
  databaseName: string;
  messagePort: number;
  loadServerPort: number;
  peerMessagePorts: Array<number>;
  ganachePort: number;
  chainId: number;
  artifactFile: string;
};
const ROLES: Record<Partcipants, RoleConfig> = {
  A: {
    databaseName: 'server_wallet_test_a',
    messagePort: 6050,
    loadServerPort: 6060,
    peerMessagePorts: [6051],
    ganachePort: 8545,
    chainId: 9001,
    artifactFile: 'contract_artifacts.json',
  },
  B: {
    databaseName: 'server_wallet_test_b',
    messagePort: 6051,
    loadServerPort: 6061,
    peerMessagePorts: [6050],
    ganachePort: 8545,
    chainId: 9001,
    artifactFile: 'contract_artifacts.json',
  },
};

async function setupNode(): Promise<ServerWalletNode> {
  const {role} = await yargs(hideBin(process.argv)).option('role', {
    describe: 'The role for the server wallet node',
    demandOption: true,
    type: 'string',
    choices: ['A', 'B'],
  }).argv;

  const roleConfig = ROLES[role === 'A' ? 'A' : 'B'];

  const rpcEndPoint = `http://localhost:${roleConfig.ganachePort}`;

  const walletConfig: WalletConfig = overwriteConfigWithDatabaseConnection(
    defaultTestWalletConfig({
      networkConfiguration: {
        chainNetworkID: roleConfig.chainId,
      },
      loggingConfiguration: {
        logDestination: path.join(ARTIFACTS_DIR, 'new-e2e.log'),
        logLevel: 'trace',
      },
      chainServiceConfiguration: {
        attachChainService: true,
        provider: rpcEndPoint,
        /* eslint-disable-next-line no-process-env */
        pk: process.env.CHAIN_SERVICE_PK ?? TEST_ACCOUNTS[1].privateKey,
        allowanceMode: 'MaxUint',
      },
      syncConfiguration: {pollInterval: 1_000, timeOutThreshold: 60_000, staleThreshold: 10_000},
    }),
    {database: roleConfig.databaseName}
  );

  await DBAdmin.dropDatabase(walletConfig);
  await DBAdmin.createDatabase(walletConfig);
  await DBAdmin.migrateDatabase(walletConfig);
  const contractArtifacts = await readFile(roleConfig.artifactFile);

  // eslint-disable-next-line no-process-env
  process.env = {...process.env, ...contractArtifacts};

  const serverNode = await ServerWalletNode.create(
    walletConfig,
    roleConfig.messagePort,
    roleConfig.loadServerPort
  );

  for (const peerPort of roleConfig.peerMessagePorts) {
    await serverNode.registerPeer(peerPort);
  }
  return serverNode;
}
