import {
  DBAdmin,
  defaultTestConfig,
  Output,
  SingleChannelOutput,
  SingleThreadedWallet
} from '@statechannels/server-wallet';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {BrowserWallet, Message} from '@statechannels/xstate-wallet';
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
import {WalletObjective} from '@statechannels/server-wallet/src/models/objective';

jest.setTimeout(60_000);

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const rpcEndpoint = process.env.RPC_ENDPOINT;
const chainId = process.env.CHAIN_ID;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!rpcEndpoint) throw new Error('RPC_ENDPOINT must be defined');

const serverConfig = defaultTestConfig({
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

function serverMessageToBrowserMessage(serverOutput: Output): Message {
  const wirePayload = validatePayload(serverOutput.outbox[0].params.data);
  return {
    objectives: wirePayload.objectives?.map(deserializeObjective) || [],
    signedStates: wirePayload.signedStates?.map(deserializeState) || []
  };
}

it('server + browser wallet interoperability test', async () => {
  const serverWallet = await SingleThreadedWallet.create(serverConfig);
  const serverAddress = await serverWallet.getSigningAddress();
  const serverDestination = makeDestination(serverAddress);

  const objectiveSuccededPromise = new Promise<void>(r => {
    serverWallet.on('objectiveSucceeded', (o: WalletObjective) => {
      if (o.type === 'OpenChannel' && o.status === 'succeeded') r();
    });
  });

  const onNewMessageFromBroserWallet = (message: Message) => {
    const wireMessage = {
      ...message,
      signedStates: message.signedStates?.map(s => serializeState(s))
    };
    serverWallet.pushMessage({
      ...wireMessage,
      requests: [],
      walletVersion: '@statechannels/server-wallet@1.23.0'
    });
  };

  const browserWallet = await BrowserWallet.create(
    onNewMessageFromBroserWallet,
    makeAddress('0xd4Fa489Eacc52BA59438993f37Be9fcC20090E39')
  );
  const browserAddress = await browserWallet.store.getAddress();
  const browserDestination = makeDestination(await browserWallet.store.getAddress());

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
        participantId: 'browser',
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

  await browserWallet.incomingMessage(serverMessageToBrowserMessage(output1));

  /** This is fragile. We are waiting for the third channelUpdated event. Note that these events consistently arrive in the following order.
   *  But the events are not guaranteed to arrive in this order:
   *  1. The first event is triggered by the registration of the channel with the chain service.
   *      holdingUpdated is invoked when the initial holdings are read from the chain.
   *  2. The second event is triggered by the server wallet deposit. The deposit results in a holdingUpdated invocation.
   *  3. The third event is triggered by the browser wallet deposit.
   */
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postFundAPromise = fromEvent<SingleChannelOutput>(serverWallet as any, 'channelUpdated')
    .pipe(take(3))
    .toPromise();

  await browserWallet.incomingMessage(serverMessageToBrowserMessage(await postFundAPromise));
  await objectiveSuccededPromise;

  await serverWallet.destroy();
});
