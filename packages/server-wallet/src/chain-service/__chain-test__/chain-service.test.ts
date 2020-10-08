import {ContractArtifacts, getChannelId, randomChannelId} from '@statechannels/nitro-protocol';
import {BN, makeDestination, simpleEthAllocation, State} from '@statechannels/wallet-core';
import {BigNumber, constants, Contract, providers, Wallet} from 'ethers';
import _ from 'lodash';

import {defaultConfig} from '../../config';
import {Address} from '../../type-aliases';
import {
  alice as aliceParticipant,
  bob as bobParticipant,
} from '../../wallet/__test__/fixtures/participants';
import {alice as aWallet, bob as bWallet} from '../../wallet/__test__/fixtures/signing-wallets';
import {ChainService, HoldingUpdatedArg} from '../chain-service';

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = process.env.ETH_ASSET_HOLDER_ADDRESS!;
const erc20AssetHolderAddress = process.env.ERC20_ASSET_HOLDER_ADDRESS!;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!defaultConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = defaultConfig.rpcEndpoint;
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);

let chainService: ChainService;

beforeAll(() => {
  chainService = new ChainService(rpcEndpoint, defaultConfig.serverPrivateKey, 50);
});

afterAll(() => chainService.destructor());

function fundChannel(
  expectedHeld: number,
  amount: number,
  channelId: string = randomChannelId(),
  assetHolderAddress: Address = ethAssetHolderAddress
): {
  channelId: string;
  request: Promise<providers.TransactionResponse>;
} {
  const request = chainService.fundChannel({
    channelId,
    assetHolderAddress,
    expectedHeld: BN.from(expectedHeld),
    amount: BN.from(amount),
  });
  return {channelId, request};
}

async function waitForChannelFunding(
  expectedHeld: number,
  amount: number,
  channelId: string = randomChannelId(),
  assetHolderAddress: Address = ethAssetHolderAddress
): Promise<string> {
  const request = await fundChannel(expectedHeld, amount, channelId, assetHolderAddress).request;
  await request.wait();
  return channelId;
}

describe('fundChannel', () => {
  it('Successfully funds channel with 2 participants, rejects invalid 3rd', async () => {
    const channelId = await waitForChannelFunding(0, 5);
    await waitForChannelFunding(5, 5, channelId);

    const {request: fundChannelPromise} = fundChannel(5, 5, channelId);
    await expect(fundChannelPromise).rejects.toThrow(
      'cannot estimate gas; transaction may fail or may require manual gas limit'
    );
  });
});

it('Fund erc20', async () => {
  const channelId = randomChannelId();

  await waitForChannelFunding(0, 5, channelId, erc20AssetHolderAddress);
  const contract: Contract = new Contract(
    erc20AssetHolderAddress,
    ContractArtifacts.Erc20AssetHolderArtifact.abi,
    provider
  );
  expect(await contract.holdings(channelId)).toEqual(BigNumber.from(5));
});

describe('registerChannel', () => {
  it('Successfully registers channel and receives follow on funding event', async () => {
    const channelId = randomChannelId();
    const wrongChannelId = randomChannelId();
    let counter = 0;
    let resolve: () => void;
    const p = new Promise(r => (resolve = r));

    const onHoldingUpdated = (arg: HoldingUpdatedArg): void => {
      switch (counter) {
        case 0:
          expect(arg).toMatchObject({
            channelId,
            assetHolderAddress: ethAssetHolderAddress,
            amount: BN.from(0),
          });
          counter++;
          fundChannel(0, 5, wrongChannelId);
          fundChannel(0, 5, channelId);
          break;
        case 1:
          expect(arg).toMatchObject({
            channelId,
            assetHolderAddress: ethAssetHolderAddress,
            amount: BN.from(5),
          });
          counter++;
          resolve();
          break;
        default:
          throw new Error('Should not reach here');
      }
    };

    chainService.registerChannel(channelId, [ethAssetHolderAddress], {
      onHoldingUpdated,
    });
    await p;
  });

  it('Receives correct initial holding when holdings are not 0', async () => {
    const channelId = randomChannelId();
    await waitForChannelFunding(0, 5, channelId);

    await new Promise(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        onHoldingUpdated: arg => {
          expect(arg).toMatchObject({
            channelId,
            assetHolderAddress: ethAssetHolderAddress,
            amount: BN.from(5),
          });
          resolve();
        },
      })
    );
  });

  it('Channel with multiple asset holders', async () => {
    const channelId = randomChannelId();
    let resolve: () => void;
    const p = new Promise(r => (resolve = r));
    const objectsToMatch = _.flatten(
      [0, 5].map(amount =>
        [ethAssetHolderAddress, erc20AssetHolderAddress].map(assetHolderAddress => ({
          channelId,
          assetHolderAddress,
          amount: BN.from(amount),
        }))
      )
    );

    const onHoldingUpdated = (arg: HoldingUpdatedArg): void => {
      const index = objectsToMatch.findIndex(
        predicate =>
          predicate.channelId === arg.channelId &&
          predicate.amount === arg.amount &&
          predicate.assetHolderAddress === arg.assetHolderAddress
      );
      expect(index).toBeGreaterThan(-1);
      // Note, splice mutates the array on which it is called
      objectsToMatch.splice(index, 1);
      if (!objectsToMatch.length) resolve();
    };
    chainService.registerChannel(channelId, [ethAssetHolderAddress, erc20AssetHolderAddress], {
      onHoldingUpdated,
    });
    fundChannel(0, 5, channelId, ethAssetHolderAddress);
    fundChannel(0, 5, channelId, erc20AssetHolderAddress);
    await p;
  }, 15_000);
});

describe('concludeAndWithdraw', () => {
  it('Successful concludeAndWithdraw', async () => {
    const aEthWallet = Wallet.createRandom();
    const bEthWallet = Wallet.createRandom();

    const alice = aliceParticipant({destination: makeDestination(aEthWallet.address)});
    const bob = bobParticipant({destination: makeDestination(bEthWallet.address)});
    const state1: State = {
      appData: constants.HashZero,
      appDefinition: constants.AddressZero,
      isFinal: true,
      turnNum: 4,
      outcome: simpleEthAllocation([
        {destination: alice.destination, amount: BN.from(1)},
        {destination: bob.destination, amount: BN.from(3)},
      ]),
      participants: [alice, bob],
      channelNonce: 1,
      chainId: '0x01',
      challengeDuration: 9001,
    };
    const channelId = getChannelId({
      channelNonce: state1.channelNonce,
      chainId: state1.chainId,
      participants: [alice, bob].map(p => p.signingAddress),
    });
    const signatures = [aWallet(), bWallet()].map(sw => sw.signState(state1));

    await waitForChannelFunding(0, 5, channelId);
    await (await chainService.concludeAndWithdraw([{...state1, signatures}])).wait();

    expect(await provider.getBalance(aEthWallet.address)).toEqual(BigNumber.from(1));
    expect(await provider.getBalance(bEthWallet.address)).toEqual(BigNumber.from(3));
  });
});
