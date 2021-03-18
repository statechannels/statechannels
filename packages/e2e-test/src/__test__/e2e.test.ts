import {
  DBAdmin,
  defaultTestConfig,
  overwriteConfigWithDatabaseConnection,
  SingleThreadedWallet
} from '@statechannels/server-wallet';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';

const baseConfig = defaultTestConfig({
  networkConfiguration: {
    chainNetworkID: process.env.CHAIN_ID
      ? parseInt(process.env.CHAIN_ID)
      : defaultTestConfig().networkConfiguration.chainNetworkID
  },
  chainServiceConfiguration: {
    attachChainService: false,
    provider: process.env.RPC_ENDPOINT,
    pk: ETHERLIME_ACCOUNTS[0].privateKey
  }
});

const serverConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: 'server_peer'
});

beforeAll(async () => {
  await DBAdmin.migrateDatabase(serverConfig);
});

it('e2e test', async () => {
  await SingleThreadedWallet.create(serverConfig);
  expect(1).toEqual(1);
});
