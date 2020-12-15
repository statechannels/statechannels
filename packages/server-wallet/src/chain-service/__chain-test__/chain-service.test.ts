import {setTimeout} from 'timers';

import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {
  channelDataToChannelStorageHash,
  ContractArtifacts,
  getChannelId,
  randomChannelId,
  TestContractArtifacts,
} from '@statechannels/nitro-protocol';
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

import {
  alice as aliceParticipant,
  bob as bobParticipant,
} from '../../wallet/__test__/fixtures/participants';
import {alice as aWallet, bob as bWallet} from '../../wallet/__test__/fixtures/signing-wallets';
import {stateSignedBy} from '../../wallet/__test__/fixtures/states';
import {ChainService} from '../chain-service';
import {HoldingUpdatedArg} from '../types';

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const erc20AssetHolderAddress = makeAddress(process.env.ERC20_ASSET_HOLDER_ADDRESS!);
const erc20Address = makeAddress(process.env.ERC20_ADDRESS!);
const nitroAdjudicatorAddress = makeAddress(process.env.NITRO_ADJUDICATOR_ADDRESS!);

if (!process.env.RPC_ENDPOINT) throw new Error('RPC_ENDPOINT must be defined');
const rpcEndpoint = process.env.RPC_ENDPOINT;
const chainId = process.env.CHAIN_NETWORK_ID || '9002';
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);

let chainService: ChainService;
let channelNonce = 0;
async function mineBlock(timestamp: number) {
  await provider.send('evm_mine', [timestamp]);
}
async function mineBlocks() {
  for (const _i in _.range(5)) {
    await provider.send('evm_mine', []);
  }
}

function mineOnEvent(contract: Contract) {
  contract.on('Deposited', mineBlocks);
  contract.on('AllocationUpdated', mineBlocks);
}

async function mineBlockPeriodically(blocks: number) {
  for (const _i in _.range(blocks)) {
    await provider.send('evm_mine', []);
    await new Promise(r => setTimeout(r, 100));
  }
}

jest.setTimeout(20_000);
// The test nitro adjudicator allows us to set channel storage
const testAdjudicator = new Contract(
  nitroAdjudicatorAddress,
  TestContractArtifacts.TestNitroAdjudicatorArtifact.abi,
  // We use a separate signer address to avoid nonce issues
  // eslint-disable-next-line no-process-env
  new providers.JsonRpcProvider(rpcEndpoint).getSigner(1)
);
beforeAll(async () => {
  // Try to use a different private key for every chain service instantiation to avoid nonce errors
  // Using the first account here as that is the one that:
  // - Deploys the token contract.
  // - And therefore has tokens allocated to it.
  /* eslint-disable no-process-env */
  chainService = new ChainService({
    provider: rpcEndpoint,
    pk: process.env.CHAIN_SERVICE_PK ?? ETHERLIME_ACCOUNTS[0].privateKey,
    allowanceMode: 'MaxUint',
  });
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
  testAdjudicator.provider.removeAllListeners();
  provider.removeAllListeners();
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
    chainId,
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
});

describe('registerChannel', () => {
  it('dispatches a channel finalized event if the channel has been finalized BEFORE registering', async () => {
    const channelId = randomChannelId();
    const CHALLENGE_EXPIRE_TIME = 2_000_000_000;
    const FUTURE_TIME = 2_000_500_000;

    const tx = await testAdjudicator.functions.setChannelStorageHash(
      channelId,
      channelDataToChannelStorageHash({
        turnNumRecord: 0,
        finalizesAt: CHALLENGE_EXPIRE_TIME,
      })
    );
    await tx.wait();
    const channelFinalizedHandler = jest.fn();
    const channelFinalizedPromise = new Promise<void>(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        holdingUpdated: _.noop,
        assetOutcomeUpdated: _.noop,
        channelFinalized: arg => {
          channelFinalizedHandler(arg);
          resolve();
        },
      })
    );
    await mineBlock(FUTURE_TIME);
    await channelFinalizedPromise;
    expect(channelFinalizedHandler).toHaveBeenCalledWith({channelId});
  });

  it('registers a channel in the finalizing channel list and fires an event when that channel is finalized', async () => {
    const channelId = randomChannelId();
    // We use large values so we don't have to worry about ganache
    // mining a block with the current timestamp setting off the expiry
    const CURRENT_TIME = 2_000_000_000;
    const CHALLENGE_EXPIRE_TIME = 2_000_400_000;
    const FUTURE_TIME = 2_000_800_000;

    const tx = await testAdjudicator.setChannelStorageHash(
      channelId,
      channelDataToChannelStorageHash({
        turnNumRecord: 0,
        finalizesAt: CHALLENGE_EXPIRE_TIME,
      })
    );
    await tx.wait();

    const channelFinalizedHandler = jest.fn();
    const channelFinalizedPromise = new Promise<void>(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        holdingUpdated: _.noop,
        assetOutcomeUpdated: _.noop,
        channelFinalized: arg => {
          channelFinalizedHandler(arg);
          resolve();
        },
      })
    );

    await mineBlock(CURRENT_TIME);
    // Wait a second to ensure that the channel finalized handler does not get triggered erroneously
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Currently due to ganache mining blocks outside of our control we can't assert on this
    // expect(channelFinalizedHandler).not.toHaveBeenCalled();

    await mineBlock(FUTURE_TIME);
    await channelFinalizedPromise;
    expect(channelFinalizedHandler).toHaveBeenCalledWith({channelId});
  });

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
      assetOutcomeUpdated: _.noop,
      channelFinalized: _.noop,
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
        assetOutcomeUpdated: _.noop,
        channelFinalized: _.noop,
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
      assetOutcomeUpdated: _.noop,
      channelFinalized: _.noop,
    });
    fundChannel(0, 5, channelId, ethAssetHolderAddress);
    fundChannel(0, 5, channelId, erc20AssetHolderAddress);
    await p;
  });
});

describe('concludeAndWithdraw', () => {
  it('Successful concludeAndWithdraw with eth allocation', async () => {
    const {channelId, aAddress, bAddress, state, signatures} = await setUpConclude();

    const objectsToMatch = [
      {
        amount: BN.from(1),
        destination: makeDestination(aAddress).toLowerCase(),
      },
      {
        amount: BN.from(3),
        destination: makeDestination(bAddress).toLowerCase(),
      },
    ];

    const p = new Promise<void>(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        holdingUpdated: _.noop,
        assetOutcomeUpdated: arg => {
          expect(arg.assetHolderAddress).toEqual(ethAssetHolderAddress);
          expect(arg.channelId).toMatch(channelId);
          expect(arg.externalPayouts).toMatchObject(expect.arrayContaining(objectsToMatch));
          resolve();
        },
        channelFinalized: _.noop,
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

    const objectsToMatch = [
      {
        amount: BN.from(1),
        destination: makeDestination(aAddress).toLowerCase(),
      },
      {
        amount: BN.from(3),
        destination: makeDestination(bAddress).toLowerCase(),
      },
    ];

    const p = new Promise<void>(resolve =>
      chainService.registerChannel(channelId, [erc20AssetHolderAddress], {
        holdingUpdated: _.noop,
        assetOutcomeUpdated: arg => {
          expect(arg.assetHolderAddress).toEqual(erc20AssetHolderAddress);
          expect(arg.channelId).toMatch(channelId);
          expect(arg.externalPayouts).toMatchObject(expect.arrayContaining(objectsToMatch));
          resolve();
        },
        channelFinalized: _.noop,
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

describe('challenge', () => {
  it('two channels are challenged, funds are withdrawn -> final balances are correct', async () => {
    const aDestinationAddress = Wallet.createRandom().address;
    const bDestinationAddress = Wallet.createRandom().address;
    const aDestintination = makeDestination(aDestinationAddress);
    const bDestintination = makeDestination(bDestinationAddress);
    const channelNonces = [0, 1].map(getChannelNonce);

    const outcome = simpleEthAllocation([
      {destination: aDestintination, amount: BN.from(1)},
      {destination: bDestintination, amount: BN.from(3)},
    ]);
    const state0s = channelNonces.map((channelNonce, index) =>
      stateSignedBy()({
        chainId,
        challengeDuration: index + 1,
        outcome,
        channelNonce,
      })
    );
    const state1s = channelNonces.map((channelNonce, index) =>
      stateSignedBy([bWallet()])({
        chainId,
        turnNum: 1,
        challengeDuration: index + 1,
        outcome,
        channelNonce: channelNonce,
      })
    );
    const channelIds = channelNonces.map(channelNonce =>
      getChannelId({
        channelNonce: channelNonce,
        chainId: chainId,
        participants: state0s[0].participants.map(p => p.signingAddress),
      })
    );

    const channelsFinalized = channelIds.map(
      channelId =>
        new Promise(resolve =>
          chainService.registerChannel(channelId, [ethAssetHolderAddress], {
            holdingUpdated: _.noop,
            assetOutcomeUpdated: _.noop,
            channelFinalized: resolve,
          })
        )
    );
    await Promise.all(
      channelIds.map(channelId => waitForChannelFunding(0, 4, channelId, ethAssetHolderAddress))
    );

    await (await chainService.challenge([state0s[0], state1s[0]], aWallet().privateKey)).wait();
    await (await chainService.challenge([state0s[1], state1s[1]], aWallet().privateKey)).wait();
    await mineBlockPeriodically(20);
    await Promise.all(channelsFinalized);
    await Promise.all(
      state1s.map(
        async state1 =>
          await (await chainService.pushOutcomeAndWithdraw(state1, aWallet().address)).wait()
      )
    );

    expect(await provider.getBalance(aDestinationAddress)).toEqual(BigNumber.from(2));
    expect(await provider.getBalance(bDestinationAddress)).toEqual(BigNumber.from(6));
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
