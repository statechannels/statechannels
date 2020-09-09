import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {Contract, ContractFactory, ethers, providers} from 'ethers';

import {defaultConfig} from '../config';

const rpcEndpoint = defaultConfig.rpcEndpoint;
const provider = new providers.JsonRpcProvider(rpcEndpoint);
const walletWithProvider = new ethers.Wallet(defaultConfig.serverSignerPrivateKey, provider);

export async function ethAssetHolder(): Promise<Contract> {
  let ethAssetHolderFactory: ContractFactory;
  try {
    ethAssetHolderFactory = await ContractFactory.fromSolidity(
      ContractArtifacts.EthAssetHolderArtifact,
      walletWithProvider
    );
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${defaultConfig.chainNetworkID}`);
    }

    throw err;
  }

  if (!defaultConfig.ethAssetHolderAddress) {
    throw new Error('ETH_ASSET_HOLDER_ADDRESS not defined');
  }

  const contract = await ethAssetHolderFactory.attach(defaultConfig.ethAssetHolderAddress);

  return contract;
}
