import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {BN, makeAddress} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import _ from 'lodash';

import {defaultTestConfig} from '../../config';
import {ChainService} from '../chain-service';

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const erc20AssetHolderAddress = makeAddress(process.env.ERC20_ASSET_HOLDER_ADDRESS!);
const erc20Address = makeAddress(process.env.ERC20_ADDRESS!);
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!defaultTestConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = defaultTestConfig.rpcEndpoint;
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);
// This is the private key for which ERC20 tokens are allocated on contract creation
const ethWalletWithTokens = new Wallet(defaultTestConfig.serverPrivateKey, provider);

// Try to use a different private key for every chain service instantiation to avoid nonce errors
const privateKey = ETHERLIME_ACCOUNTS[3].privateKey;
const ethWallet = new Wallet(privateKey, provider);

let chainService: ChainService;

beforeEach(() => {
  // Try to use a different private key for every chain service instantiation to avoid nonce errors
  chainService = new ChainService(rpcEndpoint, privateKey);
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
          allowanceAlreadyIncreased: true,
        })
        .then(response => response.wait())
    );

    return Promise.all(promises);
  }, 200_000);
});
