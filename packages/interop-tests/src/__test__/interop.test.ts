import {
  DBAdmin,
  defaultTestConfig,
  Output,
  SingleChannelOutput,
  SingleThreadedEngine
} from '@statechannels/server-wallet';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ChannelWallet} from '@statechannels/xstate-wallet';
import {constants, Contract, providers} from 'ethers';
import {BN, makeAddress, makeDestination} from '@statechannels/wallet-core';
import {fromEvent} from 'rxjs';
import {take} from 'rxjs/operators';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import _ from 'lodash';
import {WalletObjective} from '@statechannels/server-wallet/src/models/objective';
import {isJsonRpcNotification, Message, PushMessageRequest} from '@statechannels/client-api-schema';

jest.setTimeout(60_000);

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const rpcEndpoint = process.env.RPC_ENDPOINT;
const chainId = process.env.CHAIN_ID;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!rpcEndpoint) throw new Error('RPC_ENDPOINT must be defined');

const serverConfig = defaultTestConfig({
  databaseConfiguration: {
    connection: {
      database: 'interop_test'
    }
  },
  networkConfiguration: {
    chainNetworkID: chainId
      ? parseInt(chainId)
      : defaultTestConfig().networkConfiguration.chainNetworkID
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    pk: ETHERLIME_ACCOUNTS[0].privateKey
  }
});

let provider: providers.JsonRpcProvider;

beforeAll(async () => {
  await DBAdmin.truncateDatabase(serverConfig);

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

function serverMessageToBrowserMessage(serverOutput: Output): PushMessageRequest {
  return generatePushMessage(serverOutput.outbox[0].params);
}

it('server + browser wallet interoperability test', async () => {
  const serverWallet = await SingleThreadedEngine.create(serverConfig);
  const serverAddress = await serverWallet.getSigningAddress();
  const serverDestination = makeDestination(serverAddress);

  const objectiveSuccededPromise = new Promise<void>(r => {
    serverWallet.on('objectiveSucceeded', (o: WalletObjective) => {
      if (o.type === 'OpenChannel' && o.status === 'succeeded') r();
    });
  });

  const browserWallet = await ChannelWallet.create();
  const browserAddress = await browserWallet.getAddress();
  const browserDestination = makeDestination(browserAddress);

  browserWallet.onSendMessage(message => {
    if (isJsonRpcNotification(message)) {
      serverWallet.pushMessage((message.params as Message).data);
    }
  });

  const output1 = await serverWallet.createChannel({
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
        participantId: browserAddress,
        signingAddress: browserAddress,
        destination: browserDestination
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
          {amount: BN.from(5), destination: browserDestination}
        ]
      }
    ]
  });

  await browserWallet.pushMessage(serverMessageToBrowserMessage(output1), 'dummyDomain');

  /** This is fragile. We are waiting for the third channelUpdated event. Note that these events consistently arrive in the following order.
   *  But the events are not guaranteed to arrive in this order:
   *  1. The first event is triggered by the registration of the channel with the chain service.
   *      holdingUpdated is invoked when the initial holdings are read from the chain.
   *  2. The second event is triggered by the server wallet deposit. The deposit results in a holdingUpdated invocation.
   *  3. The third event is triggered by the browser wallet deposit.
   */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postFundAPromise = fromEvent<SingleChannelOutput>(serverWallet as any, 'channelUpdated')
    .pipe(take(3))
    .toPromise();

  await browserWallet.pushMessage(
    serverMessageToBrowserMessage(await postFundAPromise),
    'dummyDomain'
  );

  await objectiveSuccededPromise;

  await serverWallet.destroy();
});

function generatePushMessage(messageParams: Message): PushMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 111111111,
    method: 'PushMessage',
    params: messageParams
  };
}
