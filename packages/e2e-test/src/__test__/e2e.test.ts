import {
  DBAdmin,
  defaultTestConfig,
  overwriteConfigWithDatabaseConnection,
  SingleThreadedWallet
} from '@statechannels/server-wallet';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {FakeChain, Player} from '@statechannels/xstate-wallet';
import {constants} from 'ethers';
import {BN, makeDestination} from '@statechannels/wallet-core';

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
  const serverWallet = await SingleThreadedWallet.create(serverConfig);
  const fakeChain = new FakeChain();
  const xstateWallet = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );

  const serverAddress = await serverWallet.getSigningAddress();
  const serverDestination = makeDestination(serverAddress);
  const xstateDestination = makeDestination(xstateWallet.destination);

  const {
    outbox: [{params}],
    channelResults: [{channelId}]
  } = await serverWallet.createChannel({
    appData: '0x',
    appDefinition: constants.AddressZero,
    fundingStrategy: 'Direct',
    challengeDuration: 86400, // one day
    participants: [
      {
        participantId: 'server',
        signingAddress: serverAddress,
        destination: serverDestination
      },
      {
        participantId: 'xstate',
        signingAddress: await xstateWallet.store.getAddress(),
        destination: xstateDestination
      }
    ],
    allocations: [
      {
        assetHolderAddress: constants.AddressZero,
        allocationItems: [
          {
            amount: BN.from(0),
            destination: serverDestination
          },
          {amount: BN.from(0), destination: xstateDestination}
        ]
      }
    ]
  });

  expect(1).toEqual(1);
});

function generatePushMessage(messageParams): PushMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 111111111,
    method: 'PushMessage',
    params: messageParams
  };
}
