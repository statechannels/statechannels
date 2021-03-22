import {
  DBAdmin,
  defaultTestConfig,
  overwriteConfigWithDatabaseConnection,
  SingleChannelOutput,
  SingleThreadedWallet
} from '@statechannels/server-wallet';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ClientWallet} from '@statechannels/xstate-wallet';
import {constants, Contract, providers} from 'ethers';
import {
  BN,
  deserializeObjective,
  deserializeState,
  makeAddress,
  makeDestination,
  serializeState,
  validatePayload
} from '@statechannels/wallet-core';
import {fromEvent} from 'rxjs';
import {take} from 'rxjs/operators';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import _ from 'lodash';

jest.setTimeout(60_000);

// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
if (!process.env.RPC_ENDPOINT) throw new Error('RPC_ENDPOINT must be defined');
// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
const rpcEndpoint = process.env.RPC_ENDPOINT;

const baseConfig = defaultTestConfig({
  networkConfiguration: {
    chainNetworkID: process.env.CHAIN_ID
      ? parseInt(process.env.CHAIN_ID)
      : defaultTestConfig().networkConfiguration.chainNetworkID
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: process.env.RPC_ENDPOINT,
    pk: ETHERLIME_ACCOUNTS[0].privateKey
  }
});

const serverConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: 'server_peer'
});

let provider: providers.JsonRpcProvider;

beforeAll(async () => {
  await DBAdmin.truncateDatabase(serverConfig);
  await DBAdmin.migrateDatabase(serverConfig);

  provider = new providers.JsonRpcProvider(rpcEndpoint);
  const assetHolder = new Contract(
    ethAssetHolderAddress,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    provider
  );
  mineOnEvent(assetHolder);
});

async function mineBlocks(confirmations = 5) {
  for (const _i in _.range(confirmations)) {
    await provider.send('evm_mine', []);
  }
}
const mineBlocksForEvent = () => mineBlocks();
function mineOnEvent(contract: Contract) {
  contract.on('Deposited', mineBlocksForEvent);
}

it('e2e test', async () => {
  const serverWallet = await SingleThreadedWallet.create(serverConfig);
  const xstateWallet = await ClientWallet.create();

  const serverAddress = await serverWallet.getSigningAddress();
  const serverDestination = makeDestination(serverAddress);
  const xstateDestination = makeDestination(await xstateWallet.store.getAddress());

  const {
    outbox: [{params}]
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
        assetHolderAddress: ethAssetHolderAddress,
        allocationItems: [
          {
            amount: BN.from(3),
            destination: serverDestination
          },
          {amount: BN.from(5), destination: xstateDestination}
        ]
      }
    ]
  });

  const wirePayload = validatePayload(params.data);
  const payload = {
    objectives: wirePayload.objectives?.map(deserializeObjective) || [],
    signedStates: wirePayload.signedStates?.map(deserializeState) || []
  };

  const xstatePrefundResponse = await xstateWallet.incomingMessage(payload);

  const wireXstatePrefundResponse = {
    ...xstatePrefundResponse,
    signedStates: xstatePrefundResponse.signedStates?.map(s => serializeState(s))
  };
  const serverPreDepositResponse = await serverWallet.pushMessage({
    ...wireXstatePrefundResponse,
    requests: [],
    walletVersion: '@statechannels/server-wallet@1.23.0'
  });

  const postFundAPromise = fromEvent<SingleChannelOutput>(serverWallet as any, 'channelUpdated')
    .pipe(take(3))
    .toPromise();
  const singleChannelOutput = await postFundAPromise;
  const wirePayload2 = validatePayload(singleChannelOutput.outbox[0].params.data);
  const payload2 = {
    objectives: wirePayload2.objectives?.map(deserializeObjective) || [],
    signedStates: wirePayload2.signedStates?.map(deserializeState) || []
  };
  const xstatePrefundResponse2 = await xstateWallet.incomingMessage(payload2);

  expect(serverPreDepositResponse).toBeDefined();
});
