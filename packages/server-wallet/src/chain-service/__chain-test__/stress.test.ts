import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {BN} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import _ from 'lodash';

import {defaultTestConfig} from '../../config';
import {ChainService} from '../chain-service';

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const erc20AssetHolderAddress = process.env.ERC20_ASSET_HOLDER_ADDRESS!;
const erc20Address = process.env.ERC20_ADDRESS!;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!defaultTestConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = defaultTestConfig.rpcEndpoint;
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);
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
    const contract: Contract = new Contract(
      erc20Address,
      ContractArtifacts.TokenArtifact.abi,
      ethWallet
    );
    await (await contract.increaseAllowance(erc20AssetHolderAddress, BN.from(500))).wait();

    const promises = _.range(0, iterations).map(() =>
      chainService.fundChannel({
        channelId: randomChannelId(),
        assetHolderAddress: erc20AssetHolderAddress,
        expectedHeld: BN.from(0),
        amount: BN.from(depositAmount),
        allowanceAlreadyIncreased: true,
      })
    );

    Promise.all(promises);
  }, 200_000);
});
