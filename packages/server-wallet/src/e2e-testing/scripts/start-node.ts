import path from 'path';
import * as fs from 'fs';

import * as jsonfile from 'jsonfile';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
/* eslint-disable no-process-env */
import {providers} from 'ethers';
import _ from 'lodash';

import {
  defaultTestWalletConfig,
  overwriteConfigWithDatabaseConnection,
  WalletConfig,
} from '../../config';
import {ServerWalletNode} from '../server-wallet-node';
import {DBAdmin} from '../..';
import {ARTIFACTS_DIR} from '../../../jest/chain-setup';

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
  privateKey: string;
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
    // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf
    privateKey: '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318',
  },
  B: {
    databaseName: 'server_wallet_test_b',
    messagePort: 6051,
    loadServerPort: 6061,
    peerMessagePorts: [6050],
    ganachePort: 8545,
    chainId: 9001,
    artifactFile: 'contract_artifacts.json',
    // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9
    privateKey: '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727',
  },
};

async function setupNode(): Promise<ServerWalletNode> {
  try {
    fs.mkdirSync(ARTIFACTS_DIR);
  } catch (err) {
    if (!(err.message as string).includes('EEXIST')) throw err;
  }
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
        pk: TEST_ACCOUNTS[role === 'A' ? 0 : 1].privateKey,
        allowanceMode: 'MaxUint',
      },
      syncConfiguration: {pollInterval: 1_000, timeOutThreshold: 60_000, staleThreshold: 10_000},
      privateKey: roleConfig.privateKey,
    }),
    {database: roleConfig.databaseName}
  );

  await DBAdmin.truncateDatabase(walletConfig);

  const contractArtifacts = await jsonfile.readFile(roleConfig.artifactFile);

  // eslint-disable-next-line no-process-env
  process.env = {...process.env, ...contractArtifacts};

  const provider = new providers.JsonRpcProvider(rpcEndPoint);
  setInterval(() => provider.send('evm_mine', []), 1000);
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
