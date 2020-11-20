import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts, getChannelId, randomChannelId} from '@statechannels/nitro-protocol';
import {
  Address,
  BN,
  makeAddress,
  makeDestination,
  simpleEthAllocation,
  simpleTokenAllocation,
  State,
} from '@statechannels/wallet-core';
import {BigNumber, constants, Contract, providers, Wallet} from 'ethers';
import _ from 'lodash';

import {defaultTestConfig} from '../../config';
import {
  alice as aliceParticipant,
  bob as bobParticipant,
} from '../../wallet/__test__/fixtures/participants';
import {alice as aWallet, bob as bWallet} from '../../wallet/__test__/fixtures/signing-wallets';
import {AssetTransferredArg, ChainService, HoldingUpdatedArg} from '../chain-service';

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const erc20AssetHolderAddress = makeAddress(process.env.ERC20_ASSET_HOLDER_ADDRESS!);
const erc20Address = makeAddress(process.env.ERC20_ADDRESS!);
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!defaultTestConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = defaultTestConfig.rpcEndpoint;
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);

let chainService: ChainService;
let channelNonce = 0;

async function mineBlocks() {
  for (const _i in _.range(5)) {
    await provider.send('evm_mine', []);
  }
}

function mineOnEvent(contract: Contract) {
  contract.on('Deposited', mineBlocks);
  contract.on('AssetTransferred', mineBlocks);
}

jest.setTimeout(20_000);

beforeAll(() => {
  // Try to use a different private key for every chain service instantiation to avoid nonce errors
  // Using the first account here as that is the one that:
  // - Deploys the token contract.
  // - And therefore has tokens allocated to it.
  /* eslint-disable no-process-env */
  chainService = new ChainService(
    rpcEndpoint,
    process.env.CHAIN_SERVICE_PK ?? ETHERLIME_ACCOUNTS[0].privateKey
  );
  /* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

  const ethHolder = new Contract(
    ethAssetHolderAddress,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    provider
  );
  mineOnEvent(ethHolder);
  const erc20Holder = new Contract(
    erc20AssetHolderAddress,
    ContractArtifacts.Erc20AssetHolderArtifact.abi,
    provider
  );
  mineOnEvent(erc20Holder);
});

afterAll(() => {
  chainService.destructor();
  provider.polling = false;
});

function getChannelNonce() {
  return channelNonce++;
}

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

async function setUpConclude(isEth = true) {
  const aEthWallet = Wallet.createRandom();
  const bEthWallet = Wallet.createRandom();

  const alice = aliceParticipant({destination: makeDestination(aEthWallet.address)});
  const bob = bobParticipant({destination: makeDestination(bEthWallet.address)});
  const outcome = isEth
    ? simpleEthAllocation([
        {destination: alice.destination, amount: BN.from(1)},
        {destination: bob.destination, amount: BN.from(3)},
      ])
    : simpleTokenAllocation(erc20AssetHolderAddress, [
        {destination: alice.destination, amount: BN.from(1)},
        {destination: bob.destination, amount: BN.from(3)},
      ]);
  const state1: State = {
    appData: constants.HashZero,
    appDefinition: makeAddress(constants.AddressZero),
    isFinal: true,
    turnNum: 4,
    outcome,
    participants: [alice, bob],
    channelNonce: getChannelNonce(),
    // eslint-disable-next-line no-process-env
    chainId: process.env.CHAIN_NETWORK_ID || '9002',
    challengeDuration: 9001,
  };
  const channelId = getChannelId({
    channelNonce: state1.channelNonce,
    chainId: state1.chainId,
    participants: [alice, bob].map(p => p.signingAddress),
  });
  const signatures = [aWallet(), bWallet()].map(sw => sw.signState(state1));

  await waitForChannelFunding(
    0,
    4,
    channelId,
    isEth ? ethAssetHolderAddress : erc20AssetHolderAddress
  );
  return {
    channelId,
    aAddress: aEthWallet.address,
    bAddress: bEthWallet.address,
    state: state1,
    signatures,
  };
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
    let resolve: (value: unknown) => void;
    const p = new Promise(r => (resolve = r));

    const holdingUpdated = (arg: HoldingUpdatedArg): void => {
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
          chainService.unregisterChannel(channelId);
          resolve(undefined);
          break;
        default:
          throw new Error('Should not reach here');
      }
    };

    chainService.registerChannel(channelId, [ethAssetHolderAddress], {
      holdingUpdated,
      assetTransferred: _.noop,
    });
    await p;
  });

  it('Receives correct initial holding when holdings are not 0', async () => {
    const channelId = randomChannelId();
    await waitForChannelFunding(0, 5, channelId);

    await new Promise(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        holdingUpdated: arg => {
          expect(arg).toMatchObject({
            channelId,
            assetHolderAddress: ethAssetHolderAddress,
            amount: BN.from(5),
          });
          resolve(true);
        },
        assetTransferred: _.noop,
      })
    );
  });

  it('Channel with multiple asset holders', async () => {
    const channelId = randomChannelId();
    let resolve: (value: unknown) => void;
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

    const holdingUpdated = (arg: HoldingUpdatedArg): void => {
      const index = objectsToMatch.findIndex(
        predicate =>
          predicate.channelId === arg.channelId &&
          predicate.amount === arg.amount &&
          predicate.assetHolderAddress === arg.assetHolderAddress
      );
      expect(index).toBeGreaterThan(-1);
      // Note, splice mutates the array on which it is called
      objectsToMatch.splice(index, 1);
      if (!objectsToMatch.length) resolve(true);
    };
    chainService.registerChannel(channelId, [ethAssetHolderAddress, erc20AssetHolderAddress], {
      holdingUpdated,
      assetTransferred: _.noop,
    });
    fundChannel(0, 5, channelId, ethAssetHolderAddress);
    fundChannel(0, 5, channelId, erc20AssetHolderAddress);
    await p;
  });
});

describe('concludeAndWithdraw', () => {
  it('Successful concludeAndWithdraw with eth allocation', async () => {
    const {channelId, aAddress, bAddress, state, signatures} = await setUpConclude();

    let counter = 0;
    const p = new Promise(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        holdingUpdated: _.noop,
        assetTransferred: (arg: AssetTransferredArg) => {
          switch (counter) {
            case 0:
              expect(arg).toMatchObject({
                amount: BN.from(1),
                assetHolderAddress: ethAssetHolderAddress,
                to: makeDestination(aAddress),
                channelId,
              });
              counter++;
              break;
            case 1:
              expect(arg).toMatchObject({
                amount: BN.from(3),
                assetHolderAddress: ethAssetHolderAddress,
                to: makeDestination(bAddress),
                channelId,
              });
              resolve(true);
              break;
          }
        },
      })
    );

    const transactionResponse = await chainService.concludeAndWithdraw([{...state, signatures}]);
    if (!transactionResponse) throw 'Expected transaction response';
    await transactionResponse.wait();

    expect(await provider.getBalance(aAddress)).toEqual(BigNumber.from(1));
    expect(await provider.getBalance(bAddress)).toEqual(BigNumber.from(3));
    await p;
  });

  it('Successful concludeAndWithdraw with erc20 allocation', async () => {
    const {channelId, aAddress, bAddress, state, signatures} = await setUpConclude(false);

    let counter = 0;
    const p = new Promise(resolve =>
      chainService.registerChannel(channelId, [erc20AssetHolderAddress], {
        holdingUpdated: _.noop,
        assetTransferred: (arg: AssetTransferredArg) => {
          switch (counter) {
            case 0:
              expect(arg).toMatchObject({
                amount: BN.from(1),
                assetHolderAddress: erc20AssetHolderAddress,
                to: makeDestination(aAddress),
                channelId,
              });
              counter++;
              break;
            case 1:
              expect(arg).toMatchObject({
                amount: BN.from(3),
                assetHolderAddress: erc20AssetHolderAddress,
                to: makeDestination(bAddress),
                channelId,
              });
              resolve(true);
              break;
          }
        },
      })
    );

    const transactionResponse = await chainService.concludeAndWithdraw([{...state, signatures}]);
    if (!transactionResponse) throw 'Expected transaction response';
    await transactionResponse.wait();

    const erc20Contract: Contract = new Contract(
      erc20Address,
      ContractArtifacts.TokenArtifact.abi,
      provider
    );
    expect(await erc20Contract.balanceOf(aAddress)).toEqual(BigNumber.from(1));
    expect(await erc20Contract.balanceOf(bAddress)).toEqual(BigNumber.from(3));

    await p;
  });
});

describe('getBytecode', () => {
  it('returns the bytecode for an app definition', async () => {
    const bytecode = await chainService.fetchBytecode(ethAssetHolderAddress);
    expect(bytecode).toMatch(/^0x[A-Fa-f0-9]{64,}$/);
  });

  it('rejects when there is no bytecode deployed at the address', async () => {
    await expect(chainService.fetchBytecode(constants.AddressZero)).rejects.toThrow(
      'Bytecode missing'
    );
  });
});
