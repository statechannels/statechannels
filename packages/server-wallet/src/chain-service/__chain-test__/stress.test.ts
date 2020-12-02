import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {BN, makeAddress} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import _ from 'lodash';

import {ChainService} from '../chain-service';

const pk = ETHERLIME_ACCOUNTS[0].privateKey;

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const nitroAdjudicatorAddress = makeAddress(process.env.NITRO_ADJUDICATOR_ADDRESS!);
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const erc20AssetHolderAddress = makeAddress(process.env.ERC20_ASSET_HOLDER_ADDRESS!);
const erc20Address = makeAddress(process.env.ERC20_ADDRESS!);
if (!process.env.RPC_ENDPOINT) throw new Error('RPC_ENDPOINT must be defined');
const rpcEndpoint = process.env.RPC_ENDPOINT;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);
// This is the private key for which ERC20 tokens are allocated on contract creation
const ethWalletWithTokens = new Wallet(pk, provider);

// Try to use a different private key for every chain service instantiation to avoid nonce errors
const privateKey = ETHERLIME_ACCOUNTS[3].privateKey;
const ethWallet = new Wallet(privateKey, provider);

let chainService: ChainService;

beforeEach(async () => {
  // Try to use a different private key for every chain service instantiation to avoid nonce errors
  chainService = await ChainService.create({
    provider: rpcEndpoint,
    pk: privateKey,
    allowanceMode: 'MaxUint',
    nitroAdjudicatorAddress,
    ethAssetHolderAddress,
  });
});

afterEach(() => chainService.destructor());

const iterations = 100;
// Do not run by default as it takes several minutes
describe('fundChannel', () => {
  it.skip(`${iterations} simultaneous deposits`, async () => {
    const depositAmount = 5;
    const totalTransferAmount = iterations * depositAmount;
    const contract: Contract = new Contract(erc20Address, ContractArtifacts.TokenArtifact.abi);
    await (
      await contract
        .connect(ethWalletWithTokens)
        .transfer(ethWallet.address, BN.from(totalTransferAmount))
    ).wait();
    await (
      await contract
        .connect(ethWallet)
        .increaseAllowance(erc20AssetHolderAddress, BN.from(totalTransferAmount))
    ).wait();

    const promises = _.range(0, iterations).map(() =>
      chainService
        .fundChannel({
          channelId: randomChannelId(),
          assetHolderAddress: erc20AssetHolderAddress,
          expectedHeld: BN.from(0),
          amount: BN.from(depositAmount),
        })
        .then(response => response.wait())
    );

    return Promise.all(promises);
  }, 200_000);
});
