import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {BN} from '@statechannels/wallet-core';
import {Contract, providers, Wallet} from 'ethers';
import _ from 'lodash';

import {processEnvConfig} from '../../config';
import {ChainService} from '../chain-service';

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const erc20AssetHolderAddress = process.env.ERC20_ASSET_HOLDER_ADDRESS!;
const erc20Address = process.env.ERC20_ADDRESS!;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!processEnvConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = processEnvConfig.rpcEndpoint;
const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcEndpoint);
const ethWallet = new Wallet(processEnvConfig.serverPrivateKey, provider);

let chainService: ChainService;

beforeEach(() => {
  chainService = new ChainService(rpcEndpoint, processEnvConfig.serverPrivateKey, 50);
});

afterEach(() => chainService.destructor());

// Do not run by default as it takes several minutes
describe('fundChannel', () => {
  it.skip('100 simultaneous deposits', async () => {
    const depositAmount = 5;
    const iterations = 100;
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
