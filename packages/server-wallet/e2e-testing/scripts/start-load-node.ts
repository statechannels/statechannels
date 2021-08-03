import path from 'path';
import util from 'util';

import * as jsonfile from 'jsonfile';
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import _ from 'lodash';
import chalk from 'chalk';
import ms from 'ms';

import {
  defaultTestWalletConfig,
  overwriteConfigWithDatabaseConnection,
  WalletConfig,
} from '../../src/config';
import {DBAdmin} from '../../src';
import {ARTIFACTS_DIR} from '../../jest/chain-setup';
import {WalletLoadNode} from '../wallet-load-node';
import {
  createArtifactDirectory,
  createTempDirectory,
  getRoleInfo,
  setupUnhandledErrorListeners,
} from '../utils';

setupUnhandledErrorListeners();

setupNode().then(serverNode => {
  console.log(chalk.green(`Server Wallet node listening on port ${serverNode.loadPort}`));
  serverNode.listen();
});

async function setupNode(): Promise<WalletLoadNode> {
  await createArtifactDirectory();
  await createTempDirectory();

  const {
    role: roleId,
    roleFile,
    dbPoolSizeMax,
    migrateDB,
    clearDB,
    meanDelay,
    dropRatePercentage,
  } = await yargs(hideBin(process.argv))
    .option('role', {
      alias: 'r',
      describe: 'The id of the role for this node',
      demandOption: true,
      type: 'string',
    })
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './e2e-testing/test-data/roles.json',
    })
    .option('dbPoolSizeMax', {
      alias: 'db',
      default: 10,
      min: 1,
      describe: 'The maxmimum amount of concurrent db connections',
    })
    .option('migrateDB', {
      alias: 'm',
      default: true,
      describe: `Whether the db should be migrated (and created if it doesn't exist`,
    })
    .option('clearDB', {
      alias: 'c',
      default: true,
      describe: 'Whether the db is truncated before the node is started',
    })
    .option('meanDelay', {
      default: 0,
      describe:
        'The mean delay (in MS) that the node will wait before attempting to send a message. If undefined or 0 no delays are added.',
      type: 'number',
    })
    .option('dropRatePercentage', {
      default: 0,
      min: 0,
      max: 100,
      describe: 'The percentage of messages that get dropped when trying to send a message.',
    }).argv;

  const {peers, roleConfig} = await getRoleInfo(roleFile, roleId);

  console.log(chalk.cyanBright(`Starting server wallet node as role ${roleId}`));
  console.log(chalk.yellow(`Configuration: ${util.inspect(roleConfig)}`));

  const rpcEndPoint = `http://localhost:${roleConfig.ganachePort}`;

  const walletConfig: WalletConfig = overwriteConfigWithDatabaseConnection(
    defaultTestWalletConfig({
      databaseConfiguration: {pool: {min: 0, max: dbPoolSizeMax}},
      networkConfiguration: {
        chainNetworkID: roleConfig.chainId,
      },
      loggingConfiguration: {
        logDestination: path.join(ARTIFACTS_DIR, 'e2e.log'),
        logLevel: 'trace',
      },
      chainServiceConfiguration: {
        attachChainService: true,
        provider: rpcEndPoint,
        pk: roleConfig.chainPrivateKey,
        allowanceMode: 'MaxUint',
        pollingInterval: ms('1s'),
      },
      // Nodes are running locally so we expect communication to be quick
      syncConfiguration: {
        pollInterval: ms('1s'),
        timeOutThreshold: ms('5 minutes'),
        staleThreshold: ms('1 minute'),
      },

      privateKey: roleConfig.privateKey,
    }),
    {database: roleConfig.databaseName}
  );

  if (migrateDB) {
    // If the DB already exist createDatabase does nothing
    await DBAdmin.createDatabase(walletConfig);

    await DBAdmin.migrateDatabase(walletConfig);
  }
  if (clearDB) {
    // Clean out any existing test data
    await DBAdmin.truncateDatabase(walletConfig);
  }

  // Set up the contract artifact env vars
  // as they are still used by the wallet
  const contractArtifacts = await jsonfile.readFile(roleConfig.artifactFile);
  // eslint-disable-next-line no-process-env
  process.env = {...process.env, ...contractArtifacts};

  const serverConfig = {
    serverId: roleId,
    loadServerPort: roleConfig.loadServerPort,
    messagePort: roleConfig.messagePort,
  };

  const serverNode = await WalletLoadNode.create(walletConfig, serverConfig, peers);

  for (const {messagePort} of peers) {
    await serverNode.registerMessagePeer(messagePort);
  }
  const dropRate = dropRatePercentage === 0 ? 0 : dropRatePercentage / 100;
  serverNode.setLatencyOptions({meanDelay, dropRate});

  return serverNode;
}
