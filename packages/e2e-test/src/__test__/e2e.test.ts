import {
  DBAdmin,
  defaultTestConfig,
  overwriteConfigWithDatabaseConnection,
  SingleThreadedWallet
} from '@statechannels/server-wallet';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {FakeChain, Player} from '@statechannels/xstate-wallet';

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
  const fakeChain = new FakeChain();
  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );
  expect(1).toEqual(1);
});
